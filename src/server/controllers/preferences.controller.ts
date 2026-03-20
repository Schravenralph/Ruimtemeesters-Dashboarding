import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { z } from 'zod';

const PreferencesSchema = z.object({
  locale: z.string().max(10).optional(),
  defaultTheme: z.string().max(255).optional(),
  defaultYear: z.number().int().min(2000).max(2100).optional(),
  compactNumbers: z.boolean().optional(),
  chartAnimations: z.boolean().optional(),
  autoRefresh: z.boolean().optional(),
  autoRefreshInterval: z.number().int().min(30).max(3600).optional(),
  sidebarCollapsed: z.boolean().optional(),
  colorScheme: z.string().max(50).optional(),
});

export async function getPreferences(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

  const result = await query(
    'SELECT * FROM user_preferences WHERE user_id = $1',
    [req.user.id],
  );

  if (result.rows.length === 0) {
    // Return defaults
    res.json({
      locale: 'nl',
      defaultTheme: 'overzicht',
      defaultYear: 2024,
      compactNumbers: true,
      chartAnimations: true,
      autoRefresh: false,
      autoRefreshInterval: 300,
      sidebarCollapsed: false,
      colorScheme: 'default',
    });
    return;
  }

  const row = result.rows[0];
  res.json({
    locale: row.locale,
    defaultTheme: row.default_theme,
    defaultYear: row.default_year,
    compactNumbers: row.compact_numbers,
    chartAnimations: row.chart_animations,
    autoRefresh: row.auto_refresh,
    autoRefreshInterval: row.auto_refresh_interval,
    sidebarCollapsed: row.sidebar_collapsed,
    colorScheme: row.color_scheme,
  });
}

export async function updatePreferences(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

  const parsed = PreferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid preferences', details: parsed.error.flatten() });
    return;
  }

  const prefs = parsed.data;
  const columns: string[] = [];
  const values: unknown[] = [];
  let idx = 2; // $1 is user_id

  for (const [key, value] of Object.entries(prefs)) {
    if (value !== undefined) {
      const dbKey = key.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
      columns.push(dbKey);
      values.push(value);
    }
  }

  if (columns.length === 0) {
    res.status(400).json({ error: 'No preferences to update' });
    return;
  }

  const setClause = columns.map((col, i) => `${col} = $${i + 2}`).join(', ');
  const insertCols = ['user_id', ...columns].join(', ');
  const insertVals = ['$1', ...columns.map((_, i) => `$${i + 2}`)].join(', ');

  await query(
    `INSERT INTO user_preferences (${insertCols})
     VALUES (${insertVals})
     ON CONFLICT (user_id)
     DO UPDATE SET ${setClause}, updated_at = NOW()`,
    [req.user.id, ...values],
  );

  res.json({ success: true });
}
