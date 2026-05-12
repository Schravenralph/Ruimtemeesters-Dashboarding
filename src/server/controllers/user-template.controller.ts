/**
 * User templates controller (EPIC #107 / ADR-005 / issue #93).
 *
 * v1 only exposes create. List + delete land with #94's wizard cycle.
 */

import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { CreateUserTemplateRequest, UpdateUserTemplateRequest } from '../../shared/api/contracts.js';

function rowToTemplate(r: Record<string, unknown>): Record<string, unknown> {
  return {
    id: r.id,
    userId: r.user_id,
    organizationId: r.organization_id,
    name: r.name,
    description: r.description ?? null,
    sourceThemeSlug: r.source_theme_slug ?? null,
    tiles: r.tiles ?? [],
    layout: r.layout ?? [],
    visibility: r.visibility,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export type UserTemplateScope = 'mine' | 'org' | 'public';

export async function listUserTemplates(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const scope = (req.query.scope as string | undefined) ?? 'mine';
  if (scope !== 'mine' && scope !== 'org' && scope !== 'public') {
    res.status(400).json({ error: `Invalid scope "${scope}" (expected mine|org|public)` });
    return;
  }

  let sql: string;
  let params: unknown[];
  if (scope === 'mine') {
    sql = `SELECT * FROM user_templates WHERE user_id = $1 ORDER BY updated_at DESC`;
    params = [req.user.id];
  } else if (scope === 'org') {
    if (!req.user.organizationId) {
      res.json({ rows: [] });
      return;
    }
    sql = `SELECT * FROM user_templates
           WHERE organization_id = $1 AND visibility = 'org'
           ORDER BY updated_at DESC`;
    params = [req.user.organizationId];
  } else {
    sql = `SELECT * FROM user_templates WHERE visibility = 'public' ORDER BY updated_at DESC`;
    params = [];
  }

  const result = await query(sql, params);
  res.json({ rows: result.rows.map(r => rowToTemplate(r as Record<string, unknown>)) });
}

export async function createUserTemplate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!req.user.organizationId) {
    res.status(400).json({ error: 'User has no organization — cannot create a template' });
    return;
  }

  const parsed = CreateUserTemplateRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid template payload', details: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;

  const result = await query(
    `INSERT INTO user_templates
       (user_id, organization_id, name, description, source_theme_slug, tiles, layout, visibility)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::user_template_visibility)
     RETURNING *`,
    [
      req.user.id,
      req.user.organizationId,
      body.name,
      body.description ?? null,
      body.sourceThemeSlug ?? null,
      JSON.stringify(body.tiles),
      JSON.stringify(body.layout),
      body.visibility,
    ],
  );

  res.status(201).json(rowToTemplate(result.rows[0] as Record<string, unknown>));
}

export async function updateUserTemplate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  const id = req.params.id;
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: 'id is required' });
    return;
  }

  const parsed = UpdateUserTemplateRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid template patch', details: parsed.error.flatten() });
    return;
  }
  const body = parsed.data;
  if (body.name === undefined && body.description === undefined && body.visibility === undefined) {
    res.status(400).json({ error: 'At least one of name, description, or visibility must be supplied' });
    return;
  }

  const existing = await query<{ id: string; user_id: string; organization_id: string }>(
    `SELECT id, user_id, organization_id FROM user_templates WHERE id = $1`,
    [id],
  );
  if (!existing.rowCount) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  const row = existing.rows[0];
  const isOwner = row.user_id === req.user.id;
  const isOrgAdmin = req.user.role === 'admin' && row.organization_id === req.user.organizationId;
  if (!isOwner && !isOrgAdmin) {
    res.status(403).json({ error: 'Not authorised to edit this template' });
    return;
  }

  const result = await query(
    `UPDATE user_templates
        SET name = COALESCE($2, name),
            description = CASE WHEN $3::text = '__keep__' THEN description ELSE $3 END,
            visibility = COALESCE($4::user_template_visibility, visibility),
            updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [
      id,
      body.name ?? null,
      body.description === undefined ? '__keep__' : body.description,
      body.visibility ?? null,
    ],
  );
  res.json(rowToTemplate(result.rows[0] as Record<string, unknown>));
}
