# Projects + Theme-as-Template Bootstrap

**Date:** 2026-05-09
**Status:** Approved
**Implements:** ADR-004
**Depends on:** existing `dashboard_templates` table (migration 006, currently 0 rows), `data_source_subscriptions` (migration 016)

## Summary

Introduce a first-class `Project` entity (many-per-org) and the bootstrap flow that provisions one. Picking a theme at project creation auto-subscribes the org to the theme's data sources, clones the theme's prebuilt tiles + layout into the project (via `dashboard_templates`, finally repurposed), and lands the user in the per-gemeente drilldown view of the project's default dashboard.

Includes the "Update from theme" diff-preview workflow.

## Success Criteria

| Metric | Threshold |
|--------|-----------|
| Project creation perceived latency | < 1.5 s (server-side atomic transaction) |
| Atomicity | Any failed sub-step rolls back the whole creation (no orphan subscriptions / dashboards) |
| `dashboard_templates` backfill | All 15 existing system themes seeded as templates |
| Slug uniqueness | Per-org (`UNIQUE (organization_id, slug)`) |
| Sync schedule respect | Project creation does NOT create per-project sync schedules (memory: pulls are global) |
| `/p/:projectSlug` resolves to focal-gemeente drilldown view of default dashboard | yes |
| Legacy `/dashboard/:themeSlug` continues to work (resolves to user's last-active project) | back-compat |
| "Update from theme" shows diff before applying | required confirmation, no silent merge |
| TypeScript | 0 errors |
| Tests | Bootstrap atomicity (rollback paths); slug uniqueness; theme→project clone fidelity; diff computation; routing fall-through |

## Schema

Migration `025_projects.sql`:

```sql
CREATE TABLE projects (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name               VARCHAR(255) NOT NULL,
  slug               VARCHAR(255) NOT NULL,
  theme_slug         VARCHAR(255) NOT NULL REFERENCES themes(slug),
  default_geo_code   VARCHAR(10) REFERENCES geo_areas(code),
  config             JSONB NOT NULL DEFAULT '{}',
  created_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at        TIMESTAMPTZ,
  UNIQUE (organization_id, slug)
);

CREATE INDEX idx_projects_org ON projects(organization_id) WHERE archived_at IS NULL;
CREATE INDEX idx_projects_theme ON projects(theme_slug);

CREATE TABLE project_dashboards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source_theme_slug   VARCHAR(255) NOT NULL,
  source_template_id  UUID REFERENCES dashboard_templates(id),
  source_template_version INT NOT NULL DEFAULT 1,        -- the template version cloned (for "Update from theme")
  name                VARCHAR(255) NOT NULL,
  slug                VARCHAR(255) NOT NULL,
  layout              JSONB NOT NULL DEFAULT '[]',
  tiles               JSONB NOT NULL DEFAULT '[]',
  is_default          BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (project_id, slug)
);

CREATE INDEX idx_project_dashboards_project ON project_dashboards(project_id);

ALTER TABLE users ADD COLUMN last_active_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
ALTER TABLE dashboard_templates ADD COLUMN theme_slug VARCHAR(255) REFERENCES themes(slug);
ALTER TABLE dashboard_templates ADD COLUMN version INT NOT NULL DEFAULT 1;
ALTER TABLE dashboard_templates ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
```

`dashboard_templates` is now keyed by `theme_slug + version`. Each system theme has exactly one current template; bumping `version` happens when a content change to the system theme is published. `project_dashboards.source_template_version` records which version the project's tiles were cloned from — that's how "Update from theme" computes a diff.

## Backfill (migration 026 or seed step)

`src/server/db/seed-templates.ts` — for every system theme, insert a `dashboard_templates` row capturing its current tiles + default layout (existing `dashboard_layouts` fallback for the theme). 15 themes → 15 template rows. Idempotent (UPSERT on `theme_slug` if version unchanged).

## Bootstrap Flow

`POST /api/projects`:

```typescript
interface CreateProjectInput {
  name: string;                          // "Woonzorgvisie 2030"
  themeSlug: string;                     // "wonen-overzicht"
  defaultGeoCode?: string;               // "GM0363" (Amsterdam); optional
}

interface CreateProjectResponse {
  project: Project;
  defaultDashboard: ProjectDashboard;
  subscriptionsAdded: string[];          // data_source keys newly subscribed
  routePath: string;                     // "/p/woonzorgvisie-2030/wonen-overzicht"
}
```

Server-side, all in one transaction:

1. Resolve theme by slug; load `dashboard_templates.theme_slug = …` (latest version).
2. Generate project slug from name; if collision, append `-2`, `-3`, …
3. INSERT into `projects`.
4. For every distinct `data_source` referenced by the theme's tiles: INSERT (ON CONFLICT DO NOTHING) into `data_source_subscriptions` for the org. Track the deltas.
5. INSERT into `project_dashboards` (one row, `is_default = true`, slug = theme slug). For multi-dashboard themes (future): clone all dashboards.
6. UPDATE `users.last_active_project_id`.
7. COMMIT.
8. Return the response.

If any step fails, ROLLBACK and return a structured error: `{ stage: 'subscription' | 'clone' | …, error }` so the client can surface a clear message.

## Bootstrap Wizard (Client)

`/projects/new` — three-step wizard:

1. **Theme picker.** Group by supercategory; cards per theme with name, description, sample-tile preview thumbnail.
2. **Naming + focal gemeente.** Project name (auto-suggests slug); focal gemeente picker (defaults to org's primary gemeente if set in `organizations.attributes`, else NL).
3. **Confirm.** Shows: "We will subscribe your organisation to N data sources, clone Y tiles, and land you on …". Single primary CTA "Project aanmaken".

On success, navigates to `routePath` from the response.

## Routing

- `/p/:projectSlug` → resolves project → redirects to `/p/:projectSlug/:defaultDashboardSlug`.
- `/p/:projectSlug/:dashboardSlug` → renders `DashboardPage` with project's tiles + layout (not the system theme's, unless they happen to match).
- Legacy `/dashboard/:themeSlug` → redirects to `/p/<last-active-project-slug>/:themeSlug` if the user has a last-active project; else opens a "pick a project" splash + new-project CTA.

`ProjectContext` (new) holds the current project; `DashboardPage` reads tiles + layout from `project_dashboards` instead of from the system theme when within a project route.

`ProjectSwitcher` component (header, leftmost): current project name + dropdown of org's projects + "+ Nieuw project" link.

## Update from Theme

`POST /api/projects/:id/refresh-from-theme/:dashboardId` — server-side:

1. Load the project_dashboard's `source_template_version`.
2. Load the theme's current `dashboard_templates` row (latest version).
3. If versions match, return `{ noChanges: true }`.
4. Compute a diff:
   - **Added tiles**: in template, not in project_dashboard.
   - **Removed tiles**: in project_dashboard with `source_tile_id` set, no longer in template.
   - **Modified tiles**: same `source_tile_id`, different config.
   - **Layout shifts**: layout object diff.
5. Return the diff WITHOUT applying it. Client renders a preview.
6. Separate endpoint `POST /api/projects/:id/refresh-from-theme/:dashboardId/apply` with the user's selections (which adds/removes/modifications to apply) actually mutates the project_dashboard. Bumps `source_template_version` to the new theme version.

The client UI (`<ThemeUpdateDiff>`) shows:
- "X tiles added by the theme. Add to your project?" — checkboxes per tile.
- "Y tiles removed from theme. Remove from your project?" — checkboxes (default unchecked — preserve user content).
- "Z tiles changed. Apply changes?" — checkboxes; per-tile expand shows before/after JSON diff.
- "Layout repositioned." — preview the new layout.

User confirms; selected changes apply atomically; `source_template_version` is bumped.

## Implementation Tasks

### Task 1 — Migration 025
Tables `projects`, `project_dashboards`, `users.last_active_project_id`, additions to `dashboard_templates`. No data yet.

### Task 2 — Template backfill
`src/server/db/seed-templates.ts`: for each of 15 system themes, build a `dashboard_templates` row from current tiles + dashboard_layouts. Idempotent. Wired into `pnpm run seed:templates`.

### Task 3 — Project service
`src/server/services/project-bootstrap.service.ts`. Implements the atomic bootstrap transaction. Unit-testable in isolation against a test DB.

### Task 4 — Project controller + routes
`src/server/controllers/project.controller.ts`, `src/server/routes/project.routes.ts`. Endpoints:
- `POST /api/projects` (create)
- `GET /api/projects` (list for current org)
- `GET /api/projects/:idOrSlug`
- `PATCH /api/projects/:id` (rename, change default_geo_code, archive)
- `POST /api/projects/:id/refresh-from-theme/:dashboardId` (compute diff)
- `POST /api/projects/:id/refresh-from-theme/:dashboardId/apply` (apply selected diff entries)

ABAC: project read = org membership; project create = org admin role; refresh = org admin or project owner. Rules added to existing policy engine.

### Task 5 — Theme-diff service
`src/server/services/theme-diff.service.ts`. Pure function over (project_dashboard.tiles, project_dashboard.layout, template.tiles, template.layout) → diff. Heavy-tested.

### Task 6 — Shared contract types
`Project`, `ProjectDashboard`, `CreateProjectInput`, `CreateProjectResponse`, `ThemeDiff`, `ThemeDiffEntry` in `src/shared/api/contracts.ts`.

### Task 7 — `ProjectContext` (client)
Loads org's projects + current project from URL or `users.last_active_project_id`. Exposes `useProject()`. Wraps `App.tsx`.

### Task 8 — `ProjectSwitcher` header component
Dropdown of org's projects + "+ Nieuw project". Updates `last_active_project_id` on switch.

### Task 9 — `NewProjectWizardPage` (3 steps)
At `/projects/new`. Reuses theme catalogue + GeoHierarchy.

### Task 10 — Routing changes
- Add `/p/:projectSlug/...` routes in `App.tsx`.
- Legacy `/dashboard/:themeSlug` → resolve via last-active project, fall back to splash if none.
- Project switcher updates URL + persists `last_active_project_id`.

### Task 11 — `ThemeUpdateDiff` component
Diff preview UI. Renders adds/removes/modifications/layout shifts with checkboxes; calls the apply endpoint.

### Task 12 — `DashboardPage` source change
Within project route: read tiles + layout from `project_dashboards`, not from system theme. Outside project route (legacy): unchanged.

### Task 13 — Tests
- Bootstrap service: happy path; rollback when subscription insert fails; rollback when clone fails; slug collision retry.
- Theme-diff service: tile add/remove/modify/no-change; layout shift; new-version-no-content-change.
- Controller: ABAC enforcement (non-admin cannot create); slug uniqueness; archive flow.
- Client: wizard happy path; ProjectSwitcher dropdown; routing fall-through.

### Task 14 — Demote CustomDashboards in nav
Move `CustomDashboardsPage` from main nav into a "Persoonlijk" submenu. ADR-002 mandate. Out-of-scope: deeper changes to CustomDashboards itself.

## Validation Plan

1. As an org admin, navigate to `/projects/new`. Pick "Wonen — Overzicht". Name "Woonzorgvisie 2030", focal Amsterdam. Confirm.
2. Within < 1.5 s, land on `/p/woonzorgvisie-2030/wonen-overzicht` with the per-gemeente drilldown view of Amsterdam.
3. Verify in DB: `projects` row exists; `project_dashboards` row with cloned tiles; `data_source_subscriptions` rows for bevolking/huishoudens/woningen/woningtekort (whichever the theme uses) added if not pre-existing; `users.last_active_project_id` updated.
4. Open `/dashboard/wonen-overzicht` (legacy URL) → redirects to the project URL.
5. Switch project via ProjectSwitcher → URL updates, dashboards re-render.
6. As same admin, simulate a theme content change (bump `dashboard_templates.version` and edit tiles JSON). Open the project → "Update available from theme" badge. Click → diff preview lists adds/removes/modifications. Confirm a subset → only those changes apply; `source_template_version` bumps.
7. Failure injection: with a test that aborts the subscription insert mid-bootstrap, verify zero project / zero project_dashboards / zero subscriptions remain (full rollback).
8. Slug collision: create two projects named "Woonzorgvisie 2030" → second gets slug `woonzorgvisie-2030-2`.
9. Archive a project (`PATCH archived_at`) → ProjectSwitcher hides it; URL still resolves but page shows archived banner.
10. Run all new tests; expect green. Run pre-existing tests; no regression.

## Files to Create/Modify

- `src/server/db/migrations/025_projects.sql` — NEW
- `src/server/db/seed-templates.ts` — NEW
- `src/server/services/project-bootstrap.service.ts` — NEW
- `src/server/services/theme-diff.service.ts` — NEW
- `src/server/controllers/project.controller.ts` — NEW
- `src/server/routes/project.routes.ts` — NEW
- `src/server/app.ts` — register project routes
- `src/server/middleware/abac.ts` — project-resource policies
- `src/shared/api/contracts.ts` — Project / ProjectDashboard / CreateProjectInput / ThemeDiff
- `src/client/contexts/ProjectContext.tsx` — NEW
- `src/client/components/ui/ProjectSwitcher.tsx` — NEW
- `src/client/pages/NewProjectWizardPage.tsx` — NEW
- `src/client/pages/DashboardPage.tsx` — read from project_dashboards within project route
- `src/client/components/dashboard/ThemeUpdateDiff.tsx` — NEW
- `src/client/App.tsx` — `/p/:projectSlug/...` routes; legacy fall-through
- `src/client/components/ui/Sidebar.tsx` (or wherever the nav lives) — demote CustomDashboards to submenu
- `package.json` — `seed:templates` script
- Tests for each new service / controller / component

## Non-Goals

- Per-project ABAC roles (project member vs project admin) — deferred per ADR-004.
- Multi-theme projects — deferred per ADR-004.
- Project sharing across orgs — deferred per ADR-004.
- Deep restructure of CustomDashboards — only the nav demotion is in scope.
- Forecast layer integration with project KPIs — separate spec when TSA goes live.
- Per-project sync schedules — explicitly NOT created (memory: pulls are global).
