import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { z } from 'zod';
import crypto from 'crypto';

const CreateDashboardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  tiles: z.array(z.any()).default([]),
  layout: z.array(z.any()).default([]),
});

const UpdateDashboardSchema = CreateDashboardSchema.partial();

export async function listCustomDashboards(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const result = await query(
    `SELECT id, name, description, tiles, layout, share_token, share_expires_at, created_at, updated_at
     FROM custom_dashboards
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [req.user.id],
  );

  res.json({
    dashboards: result.rows.map(r => ({
      id: r.id,
      userId: req.user!.id,
      name: r.name,
      description: r.description,
      tiles: r.tiles,
      layout: r.layout,
      shareToken: r.share_token,
      shareExpiresAt: r.share_expires_at,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  });
}

export async function createCustomDashboard(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const parsed = CreateDashboardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  // Check limit (max 5 custom dashboards)
  const countResult = await query(
    'SELECT COUNT(*) as count FROM custom_dashboards WHERE user_id = $1',
    [req.user.id],
  );
  if (parseInt(countResult.rows[0].count, 10) >= 5) {
    res.status(400).json({ error: 'Maximum of 5 custom dashboards reached' });
    return;
  }

  const { name, description, tiles, layout } = parsed.data;

  const result = await query(
    `INSERT INTO custom_dashboards (user_id, name, description, tiles, layout)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, created_at, updated_at`,
    [req.user.id, name, description || null, JSON.stringify(tiles), JSON.stringify(layout)],
  );

  res.status(201).json({
    id: result.rows[0].id,
    userId: req.user.id,
    name,
    description: description || null,
    tiles,
    layout,
    shareToken: null,
    shareExpiresAt: null,
    createdAt: result.rows[0].created_at,
    updatedAt: result.rows[0].updated_at,
  });
}

export async function updateCustomDashboard(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const parsed = UpdateDashboardSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { id } = req.params;
  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (parsed.data.name !== undefined) {
    updates.push(`name = $${idx++}`);
    params.push(parsed.data.name);
  }
  if (parsed.data.description !== undefined) {
    updates.push(`description = $${idx++}`);
    params.push(parsed.data.description);
  }
  if (parsed.data.tiles !== undefined) {
    updates.push(`tiles = $${idx++}`);
    params.push(JSON.stringify(parsed.data.tiles));
  }
  if (parsed.data.layout !== undefined) {
    updates.push(`layout = $${idx++}`);
    params.push(JSON.stringify(parsed.data.layout));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No updates provided' });
    return;
  }

  updates.push('updated_at = NOW()');
  params.push(id, req.user.id);

  const result = await query(
    `UPDATE custom_dashboards SET ${updates.join(', ')}
     WHERE id = $${idx++} AND user_id = $${idx++}
     RETURNING *`,
    params,
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Dashboard not found' });
    return;
  }

  const row = result.rows[0];
  res.json({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    tiles: row.tiles,
    layout: row.layout,
    shareToken: row.share_token,
    shareExpiresAt: row.share_expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  });
}

export async function deleteCustomDashboard(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const result = await query(
    'DELETE FROM custom_dashboards WHERE id = $1 AND user_id = $2 RETURNING id',
    [req.params.id, req.user.id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Dashboard not found' });
    return;
  }

  res.status(204).send();
}

export async function shareDashboard(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const shareToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const result = await query(
    `UPDATE custom_dashboards
     SET share_token = $1, share_expires_at = $2, updated_at = NOW()
     WHERE id = $3 AND user_id = $4
     RETURNING share_token, share_expires_at`,
    [shareToken, expiresAt, req.params.id, req.user.id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Dashboard not found' });
    return;
  }

  res.json({
    shareToken: result.rows[0].share_token,
    shareExpiresAt: result.rows[0].share_expires_at,
  });
}

export async function getSharedDashboard(req: Request, res: Response): Promise<void> {
  const { token } = req.params;

  const result = await query(
    `SELECT cd.*, u.name as user_name
     FROM custom_dashboards cd
     JOIN users u ON u.id = cd.user_id
     WHERE cd.share_token = $1 AND cd.share_expires_at > NOW()`,
    [token],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Shared dashboard not found or expired' });
    return;
  }

  const row = result.rows[0];
  res.json({
    id: row.id,
    name: row.name,
    description: row.description,
    tiles: row.tiles,
    layout: row.layout,
    createdBy: row.user_name,
    createdAt: row.created_at,
  });
}

// Layout management
export async function saveLayout(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const { themeId } = req.params;
  const { items } = req.body;

  await query(
    `INSERT INTO dashboard_layouts (theme_id, user_id, items)
     VALUES ($1, $2, $3)
     ON CONFLICT (theme_id, user_id)
     DO UPDATE SET items = $3, updated_at = NOW()`,
    [themeId, req.user.id, JSON.stringify(items)],
  );

  res.json({ success: true });
}

export async function getLayout(req: Request, res: Response): Promise<void> {
  const { themeId } = req.params;
  const userId = req.user?.id;

  // Try user-specific layout first, fall back to default
  const result = await query(
    `SELECT items FROM dashboard_layouts
     WHERE theme_id = $1 AND (user_id = $2 OR user_id IS NULL)
     ORDER BY user_id DESC NULLS LAST
     LIMIT 1`,
    [themeId, userId || null],
  );

  if (result.rows.length === 0) {
    res.json({ items: [] });
    return;
  }

  res.json({ items: result.rows[0].items });
}
