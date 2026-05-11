import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { bootstrapProject } from '../services/projects/project-bootstrap.service.js';

/**
 * SPEC-D project endpoints.
 *
 * POST   /api/projects                — create + atomic bootstrap (subscribe + clone + land)
 * GET    /api/projects                — list current org's projects (excludes archived)
 * GET    /api/projects/:idOrSlug      — single project + default dashboard summary
 * PATCH  /api/projects/:id            — rename / update default_geo_code / archive
 *
 * Auth/ABAC: project read = org membership. Project create/update = org admin role
 * (plumbed via existing requireRole middleware on the routes file). Per-project ABAC
 * deferred to v2 per ADR-004 §"What is not in this ADR".
 */

// Auth middleware augments Request.user with the full user record (see middleware/auth.ts).
type AuthRequest = Request;

export async function createProject(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  if (!user.organizationId) { res.status(400).json({ error: 'User is not in an organization' }); return; }

  const { name, themeSlug, defaultGeoCode } = req.body ?? {};
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!themeSlug || typeof themeSlug !== 'string') {
    res.status(400).json({ error: 'themeSlug is required' });
    return;
  }
  if (defaultGeoCode !== undefined && defaultGeoCode !== null && typeof defaultGeoCode !== 'string') {
    res.status(400).json({ error: 'defaultGeoCode must be a string' });
    return;
  }

  try {
    const result = await bootstrapProject({
      organizationId: user.organizationId,
      userId: user.id,
      name: name.trim(),
      themeSlug,
      defaultGeoCode: defaultGeoCode ?? undefined,
    });
    res.status(201).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bootstrap failed';
    res.status(500).json({ error: msg });
  }
}

export async function listProjects(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  if (!user.organizationId) { res.json({ projects: [] }); return; }

  const result = await query<{
    id: string; name: string; slug: string; theme_slug: string;
    default_geo_code: string | null; created_at: string; archived_at: string | null;
  }>(
    `SELECT id, name, slug, theme_slug, default_geo_code, created_at, archived_at
     FROM projects WHERE organization_id = $1 AND archived_at IS NULL
     ORDER BY created_at DESC`,
    [user.organizationId],
  );

  res.json({
    projects: result.rows.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      themeSlug: r.theme_slug,
      defaultGeoCode: r.default_geo_code,
      createdAt: r.created_at,
    })),
  });
}

export async function getProject(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  if (!user.organizationId) { res.status(403).json({ error: 'Not in an organization' }); return; }

  const idOrSlug = req.params.idOrSlug;
  if (!idOrSlug || typeof idOrSlug !== 'string') { res.status(400).json({ error: 'idOrSlug required' }); return; }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const where = isUuid
    ? 'p.id = $2 AND p.organization_id = $1'
    : 'p.slug = $2 AND p.organization_id = $1';

  const result = await query<{
    id: string; name: string; slug: string; theme_slug: string;
    default_geo_code: string | null; created_at: string; archived_at: string | null;
    default_dashboard_slug: string | null;
  }>(
    `SELECT p.id, p.name, p.slug, p.theme_slug, p.default_geo_code, p.created_at, p.archived_at,
            (SELECT slug FROM project_dashboards WHERE project_id = p.id AND is_default = true LIMIT 1) AS default_dashboard_slug
     FROM projects p
     WHERE ${where}`,
    [user.organizationId, idOrSlug],
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const r = result.rows[0];
  res.json({
    id: r.id,
    name: r.name,
    slug: r.slug,
    themeSlug: r.theme_slug,
    defaultGeoCode: r.default_geo_code,
    createdAt: r.created_at,
    archivedAt: r.archived_at,
    defaultDashboardSlug: r.default_dashboard_slug,
  });
}

// Resolve a project row by uuid or slug for the caller's org.
async function resolveProject(organizationId: string, idOrSlug: string): Promise<{ id: string } | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  const where = isUuid ? 'id = $2 AND organization_id = $1' : 'slug = $2 AND organization_id = $1';
  const r = await query<{ id: string }>(`SELECT id FROM projects WHERE ${where}`, [organizationId, idOrSlug]);
  return r.rowCount ? r.rows[0] : null;
}

export async function getProjectDashboard(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  if (!user.organizationId) { res.status(403).json({ error: 'Not in an organization' }); return; }

  const { idOrSlug, dashboardSlug } = req.params;
  if (typeof idOrSlug !== 'string' || typeof dashboardSlug !== 'string' || !idOrSlug || !dashboardSlug) {
    res.status(400).json({ error: 'idOrSlug and dashboardSlug required' });
    return;
  }

  const project = await resolveProject(user.organizationId, idOrSlug);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const result = await query<{
    id: string; project_id: string; source_theme_slug: string; source_template_version: number;
    name: string; slug: string; tiles: unknown; layout: unknown; is_default: boolean;
  }>(
    `SELECT id, project_id, source_theme_slug, source_template_version, name, slug,
            tiles, layout, is_default
     FROM project_dashboards WHERE project_id = $1 AND slug = $2`,
    [project.id, dashboardSlug],
  );
  if (result.rowCount === 0) { res.status(404).json({ error: 'Dashboard not found' }); return; }

  const r = result.rows[0];
  res.json({
    id: r.id,
    projectId: r.project_id,
    sourceThemeSlug: r.source_theme_slug,
    sourceTemplateVersion: r.source_template_version,
    name: r.name,
    slug: r.slug,
    tiles: r.tiles ?? [],
    layout: r.layout ?? [],
    isDefault: r.is_default,
  });
}

export async function putProjectDashboardLayout(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  if (!user.organizationId) { res.status(403).json({ error: 'Not in an organization' }); return; }

  const { idOrSlug, dashboardSlug } = req.params;
  if (typeof idOrSlug !== 'string' || typeof dashboardSlug !== 'string' || !idOrSlug || !dashboardSlug) {
    res.status(400).json({ error: 'idOrSlug and dashboardSlug required' });
    return;
  }
  const { layout } = req.body ?? {};
  if (!Array.isArray(layout)) {
    res.status(400).json({ error: 'layout must be an array of LayoutItems' });
    return;
  }

  const project = await resolveProject(user.organizationId, idOrSlug);
  if (!project) { res.status(404).json({ error: 'Project not found' }); return; }

  const result = await query<{ id: string }>(
    `UPDATE project_dashboards SET layout = $3::jsonb
     WHERE project_id = $1 AND slug = $2 RETURNING id`,
    [project.id, dashboardSlug, JSON.stringify(layout)],
  );
  if (result.rowCount === 0) { res.status(404).json({ error: 'Dashboard not found' }); return; }

  res.json({ ok: true });
}

export async function patchProject(req: AuthRequest, res: Response): Promise<void> {
  const user = req.user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }
  if (!user.organizationId) { res.status(403).json({ error: 'Not in an organization' }); return; }

  const id = req.params.id;
  const { name, defaultGeoCode, archived } = req.body ?? {};

  const sets: string[] = [];
  const params: unknown[] = [user.organizationId, id];
  let pIdx = 3;
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ error: 'name must be non-empty string' }); return;
    }
    sets.push(`name = $${pIdx++}`);
    params.push(name.trim());
  }
  if (defaultGeoCode !== undefined) {
    sets.push(`default_geo_code = $${pIdx++}`);
    params.push(defaultGeoCode);
  }
  if (archived !== undefined) {
    sets.push(`archived_at = $${pIdx++}`);
    params.push(archived ? new Date().toISOString() : null);
  }

  if (sets.length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }

  const result = await query(
    `UPDATE projects SET ${sets.join(', ')}
     WHERE organization_id = $1 AND id = $2
     RETURNING id, name, slug, theme_slug, default_geo_code, archived_at`,
    params,
  );
  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }
  const r = result.rows[0] as Record<string, unknown>;
  res.json({
    id: r.id,
    name: r.name,
    slug: r.slug,
    themeSlug: r.theme_slug,
    defaultGeoCode: r.default_geo_code,
    archivedAt: r.archived_at,
  });
}
