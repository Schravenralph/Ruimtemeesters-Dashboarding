import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

/**
 * Clone a custom dashboard to the current user's account.
 */
export async function cloneDashboard(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  // Check limit
  const countResult = await query(
    'SELECT COUNT(*) as count FROM custom_dashboards WHERE user_id = $1',
    [req.user.id],
  );
  if (parseInt(countResult.rows[0].count, 10) >= 5) {
    res.status(400).json({ error: 'Maximum of 5 custom dashboards reached' });
    return;
  }

  // Only allow cloning dashboards owned by the current user.
  // Shared dashboards must go through an explicit share-token based flow.
  const original = await query(
    `SELECT name, description, tiles, layout
     FROM custom_dashboards
     WHERE id = $1 AND user_id = $2`,
    [id, req.user.id],
  );

  if (original.rows.length === 0) {
    res.status(404).json({ error: 'Dashboard not found' });
    return;
  }

  const { name, description, tiles, layout } = original.rows[0];

  const result = await query(
    `INSERT INTO custom_dashboards (user_id, name, description, tiles, layout)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at, updated_at`,
    [req.user.id, `${name} (kopie)`, description, JSON.stringify(tiles), JSON.stringify(layout)],
  );

  res.status(201).json({
    id: result.rows[0].id,
    name: `${name} (kopie)`,
    description,
    tiles,
    layout,
    createdAt: result.rows[0].created_at,
    updatedAt: result.rows[0].updated_at,
  });
}

/**
 * Clone a system theme to a custom dashboard.
 */
export async function cloneThemeToDashboard(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { slug } = req.params;

  // Check limit
  const countResult = await query(
    'SELECT COUNT(*) as count FROM custom_dashboards WHERE user_id = $1',
    [req.user.id],
  );
  if (parseInt(countResult.rows[0].count, 10) >= 5) {
    res.status(400).json({ error: 'Maximum of 5 custom dashboards reached' });
    return;
  }

  // Get theme with tiles
  const themeResult = await query(
    `SELECT t.name, t.description,
            json_agg(json_build_object(
              'id', ti.id,
              'title', ti.title,
              'chartType', ti.chart_type,
              'dataSource', ti.data_source,
              'dimensions', ti.dimensions,
              'defaultGeoLevel', ti.default_geo_level,
              'description', ti.description,
              'config', ti.config
            ) ORDER BY ti."order") AS tiles
     FROM themes t
     LEFT JOIN tiles ti ON ti.theme_id = t.id
     WHERE t.slug = $1
     GROUP BY t.id`,
    [slug],
  );

  if (themeResult.rows.length === 0) {
    res.status(404).json({ error: 'Theme not found' });
    return;
  }

  const theme = themeResult.rows[0];
  const tiles = theme.tiles[0]?.id ? theme.tiles : [];

  // Generate default layout
  const layout = tiles.map((tile: { id: string }, index: number) => ({
    i: tile.id,
    x: (index % 2) * 6,
    y: Math.floor(index / 2) * 4,
    w: 6,
    h: 4,
  }));

  const result = await query(
    `INSERT INTO custom_dashboards (user_id, name, description, tiles, layout)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at, updated_at`,
    [req.user.id, `${theme.name} (kopie)`, theme.description, JSON.stringify(tiles), JSON.stringify(layout)],
  );

  res.status(201).json({
    id: result.rows[0].id,
    name: `${theme.name} (kopie)`,
    description: theme.description,
    tiles,
    layout,
    createdAt: result.rows[0].created_at,
    updatedAt: result.rows[0].updated_at,
  });
}
