import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

/**
 * Global search across geographic areas and themes.
 * Returns categorized results for a unified search experience.
 */
export async function globalSearch(req: Request, res: Response): Promise<void> {
  const q = (req.query.q as string)?.trim();

  if (!q || q.length < 2) {
    res.json({ areas: [], themes: [] });
    return;
  }

  const searchTerm = `%${q}%`;

  // Search geographic areas
  const areasResult = await query(
    `SELECT code, name, level, parent_code FROM geo_areas
     WHERE name ILIKE $1
     ORDER BY
       CASE level
         WHEN 'land' THEN 1
         WHEN 'provincie' THEN 2
         WHEN 'corop' THEN 3
         WHEN 'gemeente' THEN 4
         WHEN 'wijk' THEN 5
         WHEN 'buurt' THEN 6
       END,
       name
     LIMIT 20`,
    [searchTerm],
  );

  // Search themes
  const themesResult = await query(
    `SELECT id, slug, name, description FROM themes
     WHERE name ILIKE $1 OR description ILIKE $1
     ORDER BY "order"
     LIMIT 10`,
    [searchTerm],
  );

  // Search tiles
  const tilesResult = await query(
    `SELECT t.id, t.title, t.chart_type, t.data_source, th.slug as theme_slug, th.name as theme_name
     FROM tiles t
     JOIN themes th ON th.id = t.theme_id
     WHERE t.title ILIKE $1
     ORDER BY t.title
     LIMIT 10`,
    [searchTerm],
  );

  res.json({
    areas: areasResult.rows.map(r => ({
      code: r.code,
      name: r.name,
      level: r.level,
      parentCode: r.parent_code,
    })),
    themes: themesResult.rows.map(r => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      description: r.description,
    })),
    tiles: tilesResult.rows.map(r => ({
      id: r.id,
      title: r.title,
      chartType: r.chart_type,
      dataSource: r.data_source,
      themeSlug: r.theme_slug,
      themeName: r.theme_name,
    })),
  });
}
