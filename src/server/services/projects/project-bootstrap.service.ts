/**
 * SPEC-D §"Bootstrap Flow": atomic project creation.
 *
 * Steps in one transaction:
 *   1. Resolve theme + load latest dashboard_templates row for theme_slug.
 *      If no template exists yet, build one ad-hoc from the theme's tiles.
 *   2. Generate org-unique project slug from name (collision suffix -2, -3, ...).
 *   3. INSERT projects row.
 *   4. For each distinct data_source referenced by the theme's tiles:
 *      INSERT (ON CONFLICT DO NOTHING) into data_source_subscriptions for the org.
 *      (Sync schedules remain GLOBAL — never created per-project.)
 *   5. INSERT project_dashboards (one row, is_default = true).
 *   6. UPDATE users.last_active_project_id.
 *   7. COMMIT (rolls back on any failure → no orphans).
 *
 * Returns the created project + default dashboard + data_source keys newly subscribed.
 */

import { getClient } from '../../db/pool.js';

export interface BootstrapInput {
  organizationId: string;
  userId: string;
  name: string;
  /** Either themeSlug OR userTemplateId must be set. themeSlug is the
   *  system-theme path (existing). userTemplateId derives the dashboard
   *  from a saved user_templates row. */
  themeSlug?: string;
  userTemplateId?: string;
  defaultGeoCode?: string;
}

export interface BootstrapResult {
  project: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    themeSlug: string;
    defaultGeoCode: string | null;
    createdAt: string;
  };
  defaultDashboard: {
    id: string;
    projectId: string;
    name: string;
    slug: string;
    sourceTemplateVersion: number;
  };
  subscriptionsAdded: string[];
  routePath: string; // /p/:projectSlug/:dashboardSlug
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'project';
}

export async function bootstrapProject(input: BootstrapInput): Promise<BootstrapResult> {
  // Mutual exclusion check
  if ((!input.themeSlug && !input.userTemplateId) || (input.themeSlug && input.userTemplateId)) {
    throw new Error('Exactly one of themeSlug or userTemplateId must be provided');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Step 1: resolve the "source" — either a system theme or a user template.
    // Both paths produce: theme (id, name, slug), templateId|null, templateVersion,
    // tiles, layout. `theme.slug` is what lands in projects.theme_slug — for
    // user-template-derived dashboards this falls through to the template's
    // source_theme_slug, or to 'custom' if the template wasn't derived from any
    // system theme.
    let theme: { id: string | null; name: string; slug: string };
    let templateId: string | null = null;
    let templateVersion = 1;
    let tiles: unknown[] = [];
    let layout: unknown[] = [];

    if (input.userTemplateId) {
      // User-template path. Read with visibility enforcement:
      //   - private → only the owner can use it
      //   - org → only same-org users
      //   - public → anyone
      const utRes = await client.query<{
        id: string; name: string; source_theme_slug: string | null;
        tiles: unknown; layout: unknown; visibility: 'private' | 'org' | 'public';
        user_id: string; organization_id: string;
      }>(
        `SELECT id, name, source_theme_slug, tiles, layout, visibility, user_id, organization_id
           FROM user_templates WHERE id = $1`,
        [input.userTemplateId],
      );
      if (!utRes.rowCount) throw new Error(`Unknown user_template: ${input.userTemplateId}`);
      const tpl = utRes.rows[0];
      const visible = tpl.visibility === 'public'
        || (tpl.visibility === 'org' && tpl.organization_id === input.organizationId)
        || (tpl.visibility === 'private' && tpl.user_id === input.userId);
      if (!visible) throw new Error(`User template not visible to caller: ${input.userTemplateId}`);

      tiles = (tpl.tiles as unknown[]) ?? [];
      layout = (tpl.layout as unknown[]) ?? [];

      // theme slug: prefer the template's source theme (so the project still
      // routes / labels correctly), otherwise 'custom' sentinel.
      const fallbackSlug = tpl.source_theme_slug ?? 'custom';
      const themeRes = await client.query<{ id: string; name: string; slug: string }>(
        `SELECT id, name, slug FROM themes WHERE slug = $1`,
        [fallbackSlug],
      );
      theme = themeRes.rowCount && themeRes.rows[0]
        ? themeRes.rows[0]
        : { id: null, name: tpl.name, slug: fallbackSlug };
    } else {
      // System-theme path (existing behaviour).
      const themeRes = await client.query<{ id: string; name: string; slug: string }>(
        `SELECT id, name, slug FROM themes WHERE slug = $1`,
        [input.themeSlug],
      );
      if (themeRes.rowCount === 0) {
        throw new Error(`Unknown theme: ${input.themeSlug}`);
      }
      theme = themeRes.rows[0];

      const tplRes = await client.query<{ id: string; version: number; tiles: unknown; layout: unknown }>(
        `SELECT id, version, tiles, layout FROM dashboard_templates
         WHERE theme_slug = $1 ORDER BY version DESC LIMIT 1`,
        [input.themeSlug],
      );
      if (tplRes.rowCount && tplRes.rows[0]) {
        templateId = tplRes.rows[0].id;
        templateVersion = tplRes.rows[0].version;
        tiles = (tplRes.rows[0].tiles as unknown[]) ?? [];
        layout = (tplRes.rows[0].layout as unknown[]) ?? [];
      } else {
        // Ad-hoc snapshot from theme's current tiles. dashboard_layouts is per-user;
        // we leave layout empty and let the client fall back to grid auto-layout.
        const tilesRes = await client.query(
          `SELECT id, title, chart_type AS "chartType", data_source AS "dataSource",
                  dimensions, default_geo_level AS "defaultGeoLevel",
                  description, config, "order"
           FROM tiles WHERE theme_id = $1 ORDER BY "order"`,
          [theme.id!],
        );
        tiles = tilesRes.rows;
      }
    }

    // Step 2: collision-safe project slug within the org
    const baseSlug = slugify(input.name);
    let projectSlug = baseSlug;
    let suffix = 2;
    while (true) {
      const collision = await client.query(
        `SELECT 1 FROM projects WHERE organization_id = $1 AND slug = $2`,
        [input.organizationId, projectSlug],
      );
      if (collision.rowCount === 0) break;
      projectSlug = `${baseSlug}-${suffix++}`;
      if (suffix > 100) throw new Error('Could not allocate unique project slug');
    }

    // Step 3: INSERT project
    const projectRes = await client.query<{
      id: string; organization_id: string; name: string; slug: string;
      theme_slug: string; default_geo_code: string | null; created_at: string;
    }>(
      `INSERT INTO projects (organization_id, name, slug, theme_slug, default_geo_code, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, organization_id, name, slug, theme_slug, default_geo_code, created_at`,
      [input.organizationId, input.name, projectSlug, theme.slug, input.defaultGeoCode ?? null, input.userId],
    );
    const project = projectRes.rows[0];

    // Step 4: data_source subscriptions (idempotent UPSERT, track deltas)
    const distinctSources = [...new Set(
      (tiles as Array<{ dataSource?: string; data_source?: string }>)
        .map(t => t.dataSource ?? t.data_source)
        .filter((s): s is string => !!s),
    )];
    const subscriptionsAdded: string[] = [];
    for (const sourceKey of distinctSources) {
      const ins = await client.query(
        `INSERT INTO data_source_subscriptions (organization_id, data_source_key, subscribed_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (organization_id, data_source_key) DO NOTHING
         RETURNING data_source_key`,
        [input.organizationId, sourceKey, input.userId],
      );
      if (ins.rowCount && ins.rowCount > 0) subscriptionsAdded.push(sourceKey);
    }

    // Step 5: project_dashboards (one default dashboard cloned from template)
    const dashboardRes = await client.query<{ id: string; name: string; slug: string }>(
      `INSERT INTO project_dashboards
        (project_id, source_theme_slug, source_template_id, source_template_version, name, slug, layout, tiles, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, true)
       RETURNING id, name, slug`,
      [
        project.id, theme.slug, templateId, templateVersion,
        theme.name, theme.slug, JSON.stringify(layout), JSON.stringify(tiles),
      ],
    );
    const dashboard = dashboardRes.rows[0];

    // Step 6: mark project as user's last-active
    await client.query(
      `UPDATE users SET last_active_project_id = $1 WHERE id = $2`,
      [project.id, input.userId],
    );

    await client.query('COMMIT');

    return {
      project: {
        id: project.id,
        organizationId: project.organization_id,
        name: project.name,
        slug: project.slug,
        themeSlug: project.theme_slug,
        defaultGeoCode: project.default_geo_code,
        createdAt: project.created_at,
      },
      defaultDashboard: {
        id: dashboard.id,
        projectId: project.id,
        name: dashboard.name,
        slug: dashboard.slug,
        sourceTemplateVersion: templateVersion,
      },
      subscriptionsAdded,
      routePath: `/p/${project.slug}/${dashboard.slug}`,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export const _internals = { slugify };
