import type { Request, Response } from 'express';
import { query, getClient } from '../db/pool.js';
import { z } from 'zod';

const GeoImportSchema = z.object({
  areas: z.array(z.object({
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(255),
    level: z.enum(['land', 'provincie', 'corop', 'gemeente', 'wijk', 'buurt']),
    parentCode: z.string().nullable().optional(),
    geometry: z.any().optional(),
  })),
});

/**
 * Import geographic areas.
 * Supports bulk upsert of geographic data.
 */
export async function importGeoAreas(req: Request, res: Response): Promise<void> {
  const parsed = GeoImportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid data', details: parsed.error.flatten() });
    return;
  }

  const { areas } = parsed.data;
  if (areas.length === 0) {
    res.status(400).json({ error: 'No areas provided' });
    return;
  }

  if (areas.length > 10000) {
    res.status(400).json({ error: 'Maximum 10,000 areas per import' });
    return;
  }

  const client = await getClient();
  let inserted = 0;
  let updated = 0;

  try {
    await client.query('BEGIN');

    for (const area of areas) {
      const result = await client.query(
        `INSERT INTO geo_areas (code, name, level, parent_code, geometry)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           level = EXCLUDED.level,
           parent_code = EXCLUDED.parent_code,
           geometry = COALESCE(EXCLUDED.geometry, geo_areas.geometry)
         RETURNING (xmax = 0) as is_insert`,
        [area.code, area.name, area.level, area.parentCode || null, area.geometry ? JSON.stringify(area.geometry) : null],
      );

      if (result.rows[0].is_insert) {
        inserted++;
      } else {
        updated++;
      }
    }

    await client.query('COMMIT');

    res.json({
      total: areas.length,
      inserted,
      updated,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Import failed' });
  } finally {
    client.release();
  }
}

/**
 * Get geographic statistics.
 */
export async function getGeoStats(_req: Request, res: Response): Promise<void> {
  const result = await query(
    `SELECT level, COUNT(*) as count FROM geo_areas GROUP BY level ORDER BY
       CASE level
         WHEN 'land' THEN 1
         WHEN 'provincie' THEN 2
         WHEN 'corop' THEN 3
         WHEN 'gemeente' THEN 4
         WHEN 'wijk' THEN 5
         WHEN 'buurt' THEN 6
       END`,
  );

  const total = result.rows.reduce((sum, r) => sum + parseInt(r.count, 10), 0);

  res.json({
    levels: result.rows.map(r => ({
      level: r.level,
      count: parseInt(r.count, 10),
    })),
    total,
  });
}
