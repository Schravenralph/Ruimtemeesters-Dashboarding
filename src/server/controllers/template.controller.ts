import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

export async function listTemplates(req: Request, res: Response): Promise<void> {
  const category = req.query.category as string | undefined;
  const featured = req.query.featured === 'true';

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (category) {
    conditions.push(`category = $${idx++}`);
    params.push(category);
  }
  if (featured) {
    conditions.push('is_featured = true');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await query(
    `SELECT * FROM dashboard_templates ${where} ORDER BY is_featured DESC, usage_count DESC, name`,
    params,
  );

  res.json({
    templates: result.rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      tiles: r.tiles,
      layout: r.layout,
      isFeatured: r.is_featured,
      usageCount: r.usage_count,
      createdAt: r.created_at,
    })),
  });
}

export async function useTemplate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { id } = req.params;

  // Check dashboard limit
  const countResult = await query(
    'SELECT COUNT(*) as count FROM custom_dashboards WHERE user_id = $1',
    [req.user.id],
  );
  if (parseInt(countResult.rows[0].count, 10) >= 5) {
    res.status(400).json({ error: 'Maximum of 5 custom dashboards reached' });
    return;
  }

  // Get template
  const templateResult = await query(
    'SELECT * FROM dashboard_templates WHERE id = $1',
    [id],
  );

  if (templateResult.rows.length === 0) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  const template = templateResult.rows[0];

  // Create dashboard from template
  const result = await query(
    `INSERT INTO custom_dashboards (user_id, name, description, tiles, layout)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at`,
    [req.user.id, template.name, template.description, JSON.stringify(template.tiles), JSON.stringify(template.layout)],
  );

  // Increment usage count
  await query(
    'UPDATE dashboard_templates SET usage_count = usage_count + 1 WHERE id = $1',
    [id],
  );

  res.status(201).json({
    dashboardId: result.rows[0].id,
    templateId: id,
    name: template.name,
    createdAt: result.rows[0].created_at,
  });
}
