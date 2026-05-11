# Forge Spec: DashboardPage tile-source switch + layout persistence

**Cycle:** 10 | **Clock:** 13.3h elapsed (resumed) | **Size:** medium

## What

When DashboardPage renders under `/p/:projectSlug/:slug`, fetch the project's `project_dashboards` row (cloned at bootstrap from the theme template) and render *those* tiles + layout, instead of falling through to the system theme's tiles. Layout edits made under a project route persist into `project_dashboards.layout`, not the user/theme-scoped `dashboard_layouts`. Outside project routes, behaviour is unchanged.

## Why

SPEC-D backend + frontend shipped in #65 + #66 created project rows and `/p/:slug` routes, but the dashboard still rendered the system theme's tiles — so project-scoped customisation (today: layout; future: tile add/remove and theme-update apply) had no surface to land on. Without this, a user creating "Wonen Eindhoven" and another creating "Wonen Almere" see literally the same tiles + layout, and any layout edit overwrites the per-user default for *all* projects of that theme.

After this cycle, project-scoped tiles + layout are real, isolating dashboards per project and unblocking cycle 11 (Update-from-theme diff/apply).

## Success criteria

1. `GET /api/projects/:idOrSlug/dashboards/:dashboardSlug` returns one dashboard with `tiles`, `layout`, `name`, `slug`, `sourceTemplateVersion`, `isDefault`.
2. DashboardPage detects `:projectSlug` route param. When present, it loads the project dashboard and renders its `tiles` and `layout` (rather than `theme.tiles` + user `dashboard_layouts`).
3. `PUT /api/projects/:idOrSlug/dashboards/:dashboardSlug/layout` persists a layout array to `project_dashboards.layout`. Layout edits made under `/p/:slug/:dashboard` go to this endpoint.
4. Two projects of the same theme can hold distinct layouts at the same time (round-trip test through the bootstrap → fetch → put → fetch path).
5. Theme-route behaviour (`/dashboard/:slug`) is unchanged — all existing tests still pass.

## Approach

- New endpoint pair on `project.routes.ts`: `GET /:idOrSlug/dashboards/:dashboardSlug` (read) + `PUT /:idOrSlug/dashboards/:dashboardSlug/layout` (write). Auth = org membership. Role gate for PUT = `admin`/`editor` (same as `patchProject`).
- New shared contract `ProjectDashboard` mirroring `project_dashboards` row shape (tiles as `TileConfig[]`, layout as `LayoutItem[]`).
- New client service `src/client/services/api/project-dashboards.ts` with `getProjectDashboard` + `saveProjectDashboardLayout`.
- DashboardPage uses `useParams<{ projectSlug?: string; slug?: string }>()`. When `projectSlug` is set: fetch project dashboard, override `tiles` + `layout` source, and re-target the save handler. When not: existing theme path unchanged.
- `kpiConfig` is *not* moved to project_dashboards in this cycle — it stays on `themes.kpi_config` (since the KPI strip relies on it and the project clones the same theme). Diff/apply for KPI is a future cycle.

## Not doing

- "Update from theme" diff/apply flow (cycle 11).
- Per-project ABAC (deferred to v2 per ADR-004).
- Editing tile *list* under a project (add/remove tiles); only layout persistence this cycle.
- Multiple dashboards per project — backend already supports many `project_dashboards` rows per project, but only the `is_default` one is exposed in the UI this cycle.
- Project `kpiConfig` snapshot; KPI strip still reads from the system theme.
