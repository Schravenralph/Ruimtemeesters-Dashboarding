import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

export async function listThemes(req: Request, res: Response): Promise<void> {
  const supercategory = req.query.supercategory as string | undefined;

  let sql = `
    SELECT t.id, t.slug, t.name, t.description, t.icon, t."order", t.is_system,
           t.supercategory, t.is_overview,
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
  `;

  const params: unknown[] = [];
  if (supercategory) {
    sql += ` WHERE t.supercategory = $1`;
    params.push(supercategory);
  }

  sql += ` GROUP BY t.id ORDER BY t."order"`;

  const result = await query(sql, params);

  const themes = result.rows.map(row => ({
    ...row,
    isSystem: row.is_system,
    supercategory: row.supercategory,
    isOverview: row.is_overview,
    tiles: row.tiles[0]?.id ? row.tiles : [],
  }));

  res.json({ themes });
}

export async function getTheme(req: Request, res: Response): Promise<void> {
  const { slug } = req.params;

  const result = await query(
    `SELECT t.id, t.slug, t.name, t.description, t.icon, t."order", t.is_system,
            t.supercategory, t.is_overview,
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

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Theme not found' });
    return;
  }

  const row = result.rows[0];
  res.json({
    ...row,
    isSystem: row.is_system,
    supercategory: row.supercategory,
    isOverview: row.is_overview,
    tiles: row.tiles[0]?.id ? row.tiles : [],
  });
}
