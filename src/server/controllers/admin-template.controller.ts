/**
 * Admin template promotion (EPIC #107 / issue #96).
 *
 * Promotes an org- or public-visible `user_templates` row into a
 * system-wide `dashboard_templates` row. Adds an audit-log entry.
 * Lineage columns on `dashboard_templates` (migration 034) preserve
 * attribution to the original creator.
 */

import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { logAudit } from '../services/audit.service.js';

interface UserTemplateRow {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  source_theme_slug: string | null;
  tiles: unknown;
  layout: unknown;
  visibility: 'private' | 'org' | 'public';
}

interface DashboardTemplateRow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tiles: unknown;
  layout: unknown;
  theme_slug: string | null;
  version: number;
  source_user_template_id: string | null;
  promoted_by_user_id: string | null;
  promoted_at: string | null;
  created_at: string;
}

function rowToTemplate(r: DashboardTemplateRow & { original_user_name?: string | null; original_user_email?: string | null }) {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    category: r.category,
    tiles: r.tiles ?? [],
    layout: r.layout ?? [],
    themeSlug: r.theme_slug ?? null,
    version: r.version,
    sourceUserTemplateId: r.source_user_template_id ?? null,
    promotedByUserId: r.promoted_by_user_id ?? null,
    promotedAt: r.promoted_at ?? null,
    originalUserName: r.original_user_name ?? null,
    originalUserEmail: r.original_user_email ?? null,
    createdAt: r.created_at,
  };
}

export async function promoteTemplate(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Platform admin role required' });
    return;
  }

  const { userTemplateId, name, description } = req.body ?? {};
  if (!userTemplateId || typeof userTemplateId !== 'string') {
    res.status(400).json({ error: 'userTemplateId is required' });
    return;
  }
  if (name !== undefined && typeof name !== 'string') {
    res.status(400).json({ error: 'name must be a string when supplied' });
    return;
  }
  if (description !== undefined && description !== null && typeof description !== 'string') {
    res.status(400).json({ error: 'description must be a string or null when supplied' });
    return;
  }

  const source = await query<UserTemplateRow>(
    `SELECT id, user_id, organization_id, name, description, source_theme_slug,
            tiles, layout, visibility
       FROM user_templates WHERE id = $1`,
    [userTemplateId],
  );
  if (!source.rowCount) {
    res.status(404).json({ error: 'User template not found' });
    return;
  }
  const src = source.rows[0];
  if (src.visibility === 'private') {
    res.status(400).json({ error: 'Template must be org- or public-visible to promote' });
    return;
  }

  const inserted = await query<DashboardTemplateRow>(
    `INSERT INTO dashboard_templates
       (name, description, category, tiles, layout, theme_slug, version,
        source_user_template_id, promoted_by_user_id, promoted_at)
     VALUES ($1, $2, 'community', $3::jsonb, $4::jsonb, $5, 1, $6, $7, NOW())
     RETURNING id, name, description, category, tiles, layout, theme_slug, version,
               source_user_template_id, promoted_by_user_id, promoted_at, created_at`,
    [
      typeof name === 'string' && name.trim().length > 0 ? name.trim() : src.name,
      description === undefined ? src.description : description,
      JSON.stringify(src.tiles ?? []),
      JSON.stringify(src.layout ?? []),
      src.source_theme_slug,
      src.id,
      req.user.id,
    ],
  );

  await logAudit({
    userId: req.user.id,
    action: 'template.promote',
    resourceType: 'dashboard_template',
    resourceId: inserted.rows[0].id,
    details: {
      sourceUserTemplateId: src.id,
      sourceUserId: src.user_id,
      sourceOrganizationId: src.organization_id,
      sourceVisibility: src.visibility,
      sourceName: src.name,
    },
    ipAddress: req.ip,
  });

  res.status(201).json(rowToTemplate(inserted.rows[0]));
}

export async function listPromotedTemplates(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Platform admin role required' });
    return;
  }

  const result = await query<DashboardTemplateRow & { original_user_name: string | null; original_user_email: string | null }>(
    `SELECT dt.id, dt.name, dt.description, dt.category, dt.tiles, dt.layout,
            dt.theme_slug, dt.version, dt.source_user_template_id,
            dt.promoted_by_user_id, dt.promoted_at, dt.created_at,
            u.name AS original_user_name, u.email AS original_user_email
       FROM dashboard_templates dt
       LEFT JOIN user_templates ut ON ut.id = dt.source_user_template_id
       LEFT JOIN users u ON u.id = ut.user_id
      WHERE dt.promoted_at IS NOT NULL
      ORDER BY dt.promoted_at DESC`,
  );
  res.json({ rows: result.rows.map(rowToTemplate) });
}

interface UserTemplateCandidateRow {
  id: string;
  user_id: string;
  organization_id: string;
  name: string;
  description: string | null;
  source_theme_slug: string | null;
  visibility: 'org' | 'public';
  created_at: string;
  updated_at: string;
  user_name: string | null;
  user_email: string | null;
}

export async function listPromotionCandidates(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (req.user.role !== 'admin') {
    res.status(403).json({ error: 'Platform admin role required' });
    return;
  }

  const result = await query<UserTemplateCandidateRow>(
    `SELECT ut.id, ut.user_id, ut.organization_id, ut.name, ut.description,
            ut.source_theme_slug, ut.visibility, ut.created_at, ut.updated_at,
            u.name AS user_name, u.email AS user_email
       FROM user_templates ut
       LEFT JOIN users u ON u.id = ut.user_id
      WHERE ut.visibility IN ('org', 'public')
        AND NOT EXISTS (
          SELECT 1 FROM dashboard_templates dt
           WHERE dt.source_user_template_id = ut.id
        )
      ORDER BY ut.updated_at DESC`,
  );
  res.json({
    rows: result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      organizationId: r.organization_id,
      name: r.name,
      description: r.description ?? null,
      sourceThemeSlug: r.source_theme_slug ?? null,
      visibility: r.visibility,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      userName: r.user_name ?? null,
      userEmail: r.user_email ?? null,
    })),
  });
}
