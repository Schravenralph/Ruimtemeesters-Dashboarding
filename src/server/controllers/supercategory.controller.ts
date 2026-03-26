import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

export async function listSupercategories(req: Request, res: Response): Promise<void> {
  const result = await query(`
    SELECT s.key, s.name, s.description, s.icon, s.color, s.sort_order,
      COALESCE(
        json_agg(
          json_build_object('slug', t.slug, 'name', t.name, 'isOverview', t.is_overview)
          ORDER BY t."order"
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'
      ) as themes
    FROM supercategories s
    LEFT JOIN themes t ON t.supercategory = s.key AND t.is_system = true
    GROUP BY s.key, s.name, s.description, s.icon, s.color, s.sort_order
    ORDER BY s.sort_order
  `);

  res.json({
    supercategories: result.rows.map(r => ({
      key: r.key,
      name: r.name,
      description: r.description,
      icon: r.icon,
      color: r.color,
      sortOrder: r.sort_order,
      themes: r.themes,
    })),
  });
}
