import type { Request, Response } from 'express';
import { query, getClient } from '../db/pool.js';
import { z } from 'zod';

const CreateThemeSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  icon: z.string().optional(),
  order: z.number().default(0),
  tiles: z.array(z.object({
    title: z.string().min(1),
    chartType: z.string(),
    dataSource: z.string(),
    dimensions: z.array(z.string()).default([]),
    defaultGeoLevel: z.string().default('gemeente'),
    description: z.string().optional(),
    config: z.record(z.unknown()).default({}),
  })).default([]),
});

export async function createTheme(req: Request, res: Response): Promise<void> {
  const parsed = CreateThemeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { slug, name, description, icon, order, tiles } = parsed.data;

  // Check if slug exists
  const existing = await query('SELECT id FROM themes WHERE slug = $1', [slug]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'Theme with this slug already exists' });
    return;
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const themeResult = await client.query(
      `INSERT INTO themes (slug, name, description, icon, "order", is_system)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id`,
      [slug, name, description || null, icon || null, order],
    );

    const themeId = themeResult.rows[0].id;

    // Insert tiles
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      await client.query(
        `INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, description, config, "order")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [themeId, tile.title, tile.chartType, tile.dataSource, tile.dimensions, tile.defaultGeoLevel, tile.description || null, JSON.stringify(tile.config), i],
      );
    }

    await client.query('COMMIT');

    res.status(201).json({ id: themeId, slug, name });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function updateTheme(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (req.body.name) {
    updates.push(`name = $${idx++}`);
    params.push(req.body.name);
  }
  if (req.body.description !== undefined) {
    updates.push(`description = $${idx++}`);
    params.push(req.body.description);
  }
  if (req.body.icon !== undefined) {
    updates.push(`icon = $${idx++}`);
    params.push(req.body.icon);
  }
  if (req.body.order !== undefined) {
    updates.push(`"order" = $${idx++}`);
    params.push(req.body.order);
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No updates provided' });
    return;
  }

  params.push(id);
  const result = await query(
    `UPDATE themes SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    params,
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Theme not found' });
    return;
  }

  res.json(result.rows[0]);
}

export async function deleteTheme(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Don't delete system themes with data
  const tileCount = await query('SELECT COUNT(*) as count FROM tiles WHERE theme_id = $1', [id]);
  if (parseInt(tileCount.rows[0].count, 10) > 0) {
    // Delete tiles first
    await query('DELETE FROM tiles WHERE theme_id = $1', [id]);
  }

  const result = await query('DELETE FROM themes WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Theme not found' });
    return;
  }

  res.status(204).send();
}

export async function addTileToTheme(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const tileSchema = z.object({
    title: z.string().min(1),
    chartType: z.string(),
    dataSource: z.string(),
    dimensions: z.array(z.string()).default([]),
    defaultGeoLevel: z.string().default('gemeente'),
    description: z.string().optional(),
    config: z.record(z.unknown()).default({}),
  });

  const parsed = tileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid tile data', details: parsed.error.flatten() });
    return;
  }

  const { title, chartType, dataSource, dimensions, defaultGeoLevel, description, config } = parsed.data;

  // Get max order
  const orderResult = await query(
    'SELECT COALESCE(MAX("order"), -1) + 1 as next_order FROM tiles WHERE theme_id = $1',
    [id],
  );

  const result = await query(
    `INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, description, config, "order")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id`,
    [id, title, chartType, dataSource, dimensions, defaultGeoLevel, description || null, JSON.stringify(config), orderResult.rows[0].next_order],
  );

  res.status(201).json({ id: result.rows[0].id });
}

export async function removeTileFromTheme(req: Request, res: Response): Promise<void> {
  const { id, tileId } = req.params;

  const result = await query(
    'DELETE FROM tiles WHERE id = $1 AND theme_id = $2 RETURNING id',
    [tileId, id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Tile not found in this theme' });
    return;
  }

  res.status(204).send();
}
