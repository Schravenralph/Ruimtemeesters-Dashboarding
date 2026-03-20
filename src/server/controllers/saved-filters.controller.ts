import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { z } from 'zod';

const CreateFilterSchema = z.object({
  name: z.string().min(1).max(255),
  themeSlug: z.string().optional(),
  filters: z.object({
    geoLevel: z.string(),
    geoCode: z.string(),
    period: z.object({
      year: z.number(),
      compareYear: z.number().nullable(),
    }),
    dimensions: z.record(z.string()),
    comparisonEnabled: z.boolean(),
  }),
  isDefault: z.boolean().default(false),
});

export async function listSavedFilters(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const result = await query(
    `SELECT * FROM saved_filters WHERE user_id = $1 ORDER BY is_default DESC, name`,
    [req.user.id],
  );

  res.json({
    filters: result.rows.map(r => ({
      id: r.id,
      name: r.name,
      themeSlug: r.theme_slug,
      filters: r.filters,
      isDefault: r.is_default,
      createdAt: r.created_at,
    })),
  });
}

export async function createSavedFilter(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const parsed = CreateFilterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { name, themeSlug, filters, isDefault } = parsed.data;

  // If setting as default, unset other defaults
  if (isDefault) {
    await query(
      'UPDATE saved_filters SET is_default = false WHERE user_id = $1',
      [req.user.id],
    );
  }

  const result = await query(
    `INSERT INTO saved_filters (user_id, name, theme_slug, filters, is_default)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [req.user.id, name, themeSlug || null, JSON.stringify(filters), isDefault],
  );

  res.status(201).json({
    id: result.rows[0].id,
    name,
    themeSlug,
    filters,
    isDefault,
    createdAt: result.rows[0].created_at,
  });
}

export async function deleteSavedFilter(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const result = await query(
    'DELETE FROM saved_filters WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Saved filter not found' });
    return;
  }

  res.status(204).send();
}
