/**
 * forge-2026-05-12-002 (cycle 2): theme update diff + apply.
 *
 * computeDiff(orgId, projectIdOrSlug, dashboardSlug)
 *   → { projectVersion, templateVersion, diff: ThemeDiffEntry[] }
 *
 * applyDiff(orgId, projectIdOrSlug, dashboardSlug, tileIds)
 *   → applies the entries whose tileId is in `tileIds`; bumps
 *     project_dashboards.source_template_version to the template's current
 *     version IFF every diff entry was applied (or there was nothing to apply).
 *
 * Diff identity = tile.id. Modified = same id and any of (title, chartType,
 * dataSource, defaultGeoLevel, dimensions, config) differ. `description` is
 * intentionally excluded — copy edits do not trigger update prompts.
 */

import { query, getClient } from '../../db/pool.js';
import type { TileConfig, ThemeDiffEntry } from '../../../shared/api/contracts.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveProjectId(organizationId: string, idOrSlug: string): Promise<string | null> {
  const isUuid = UUID_RE.test(idOrSlug);
  const where = isUuid ? 'id = $2 AND organization_id = $1' : 'slug = $2 AND organization_id = $1';
  const r = await query<{ id: string }>(`SELECT id FROM projects WHERE ${where}`, [organizationId, idOrSlug]);
  return r.rowCount ? r.rows[0].id : null;
}

interface DashboardRow {
  id: string;
  sourceThemeSlug: string;
  sourceTemplateVersion: number;
  tiles: TileConfig[];
}

async function loadDashboard(projectId: string, dashboardSlug: string): Promise<DashboardRow | null> {
  const r = await query<{
    id: string; source_theme_slug: string; source_template_version: number; tiles: unknown;
  }>(
    `SELECT id, source_theme_slug, source_template_version, tiles
     FROM project_dashboards WHERE project_id = $1 AND slug = $2`,
    [projectId, dashboardSlug],
  );
  if (!r.rowCount) return null;
  const row = r.rows[0];
  return {
    id: row.id,
    sourceThemeSlug: row.source_theme_slug,
    sourceTemplateVersion: row.source_template_version,
    tiles: (row.tiles as TileConfig[]) ?? [],
  };
}

async function loadLatestTemplate(themeSlug: string): Promise<{ version: number; tiles: TileConfig[] } | null> {
  const r = await query<{ version: number; tiles: unknown }>(
    `SELECT version, tiles FROM dashboard_templates
     WHERE theme_slug = $1 ORDER BY version DESC LIMIT 1`,
    [themeSlug],
  );
  if (!r.rowCount) return null;
  return { version: r.rows[0].version, tiles: (r.rows[0].tiles as TileConfig[]) ?? [] };
}

function isTileModified(a: TileConfig, b: TileConfig): boolean {
  if (a.title !== b.title) return true;
  if (a.chartType !== b.chartType) return true;
  if (a.dataSource !== b.dataSource) return true;
  if (a.defaultGeoLevel !== b.defaultGeoLevel) return true;
  if (JSON.stringify(a.dimensions ?? []) !== JSON.stringify(b.dimensions ?? [])) return true;
  if (JSON.stringify(a.config ?? {}) !== JSON.stringify(b.config ?? {})) return true;
  return false;
}

export function diffTiles(projectTiles: TileConfig[], templateTiles: TileConfig[]): ThemeDiffEntry[] {
  const projectById = new Map(projectTiles.map(t => [t.id, t]));
  const templateById = new Map(templateTiles.map(t => [t.id, t]));
  const entries: ThemeDiffEntry[] = [];

  for (const [id, after] of templateById) {
    const before = projectById.get(id);
    if (!before) {
      entries.push({ kind: 'added', tileId: id, after });
    } else if (isTileModified(before, after)) {
      entries.push({ kind: 'modified', tileId: id, before, after });
    }
  }
  for (const [id, before] of projectById) {
    if (!templateById.has(id)) {
      entries.push({ kind: 'removed', tileId: id, before });
    }
  }
  return entries;
}

export interface ThemeDiffResult {
  projectVersion: number;
  templateVersion: number;
  diff: ThemeDiffEntry[];
}

export type ComputeDiffOutcome =
  | ThemeDiffResult
  | { notFound: 'project' | 'dashboard' };

export async function computeDiff(
  organizationId: string,
  projectIdOrSlug: string,
  dashboardSlug: string,
): Promise<ComputeDiffOutcome> {
  const projectId = await resolveProjectId(organizationId, projectIdOrSlug);
  if (!projectId) return { notFound: 'project' };
  const dashboard = await loadDashboard(projectId, dashboardSlug);
  if (!dashboard) return { notFound: 'dashboard' };

  const template = await loadLatestTemplate(dashboard.sourceThemeSlug);
  if (!template) {
    // No template seeded for this theme. Treat as up-to-date — nothing to
    // diff against. Should not occur post-#82 for system themes.
    return {
      projectVersion: dashboard.sourceTemplateVersion,
      templateVersion: dashboard.sourceTemplateVersion,
      diff: [],
    };
  }
  if (template.version === dashboard.sourceTemplateVersion) {
    return {
      projectVersion: dashboard.sourceTemplateVersion,
      templateVersion: template.version,
      diff: [],
    };
  }
  return {
    projectVersion: dashboard.sourceTemplateVersion,
    templateVersion: template.version,
    diff: diffTiles(dashboard.tiles, template.tiles),
  };
}

export interface ThemeApplyResult {
  appliedCount: number;
  newProjectVersion: number;
  fullyApplied: boolean;
}

export type ApplyDiffOutcome =
  | ThemeApplyResult
  | { notFound: 'project' | 'dashboard' | 'template' };

export async function applyDiff(
  organizationId: string,
  projectIdOrSlug: string,
  dashboardSlug: string,
  tileIds: string[],
): Promise<ApplyDiffOutcome> {
  const projectId = await resolveProjectId(organizationId, projectIdOrSlug);
  if (!projectId) return { notFound: 'project' };

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const dashRes = await client.query<{
      id: string; source_theme_slug: string; source_template_version: number; tiles: unknown;
    }>(
      `SELECT id, source_theme_slug, source_template_version, tiles
       FROM project_dashboards WHERE project_id = $1 AND slug = $2 FOR UPDATE`,
      [projectId, dashboardSlug],
    );
    if (!dashRes.rowCount) {
      await client.query('ROLLBACK');
      return { notFound: 'dashboard' };
    }
    const dashboard = dashRes.rows[0];
    const projectTiles = (dashboard.tiles as TileConfig[]) ?? [];

    const tplRes = await client.query<{ version: number; tiles: unknown }>(
      `SELECT version, tiles FROM dashboard_templates
       WHERE theme_slug = $1 ORDER BY version DESC LIMIT 1`,
      [dashboard.source_theme_slug],
    );
    if (!tplRes.rowCount) {
      await client.query('ROLLBACK');
      return { notFound: 'template' };
    }
    const template = tplRes.rows[0];
    const templateTiles = (template.tiles as TileConfig[]) ?? [];
    const allEntries = diffTiles(projectTiles, templateTiles);
    const selected = new Set(tileIds);
    const toApply = allEntries.filter(e => selected.has(e.tileId));

    const nextById = new Map(projectTiles.map(t => [t.id, t]));
    for (const entry of toApply) {
      if (entry.kind === 'added' && entry.after) nextById.set(entry.tileId, entry.after);
      else if (entry.kind === 'modified' && entry.after) nextById.set(entry.tileId, entry.after);
      else if (entry.kind === 'removed') nextById.delete(entry.tileId);
    }
    const nextTiles = Array.from(nextById.values());

    // fullyApplied = no remaining diff after this apply. True when there
    // was nothing to diff (already current — acknowledges the version) OR
    // every diff entry was selected.
    const fullyApplied = allEntries.length === 0 || toApply.length === allEntries.length;
    const newVersion = fullyApplied ? template.version : dashboard.source_template_version;

    await client.query(
      `UPDATE project_dashboards
       SET tiles = $1::jsonb, source_template_version = $2
       WHERE id = $3`,
      [JSON.stringify(nextTiles), newVersion, dashboard.id],
    );

    await client.query('COMMIT');
    return { appliedCount: toApply.length, newProjectVersion: newVersion, fullyApplied };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export const _internals = { diffTiles, isTileModified };
