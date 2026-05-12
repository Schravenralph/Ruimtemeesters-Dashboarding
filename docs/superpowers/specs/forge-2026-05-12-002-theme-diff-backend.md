# Forge Spec: Theme-diff service + endpoints (backend only)

**Cycle:** 2 (this session) | **Clock:** ~1.0 h elapsed | **Size:** medium

## What

Implements the backend half of cycle 11's "Update from theme diff + apply" spec (`forge-2026-05-11-002-update-from-theme.md`). Adds:

- `src/server/services/projects/theme-diff.service.ts` with two exports: `computeDiff(orgId, projectIdOrSlug, dashboardSlug)` and `applyDiff(orgId, projectIdOrSlug, dashboardSlug, tileIds)`. A pure `_internals.diffTiles(projectTiles, templateTiles)` helper is exported for unit testing.
- `GET /api/projects/:idOrSlug/dashboards/:dashboardSlug/theme-diff` — any org member.
- `POST /api/projects/:idOrSlug/dashboards/:dashboardSlug/theme-apply` — admin/editor; body `{ tileIds: string[] }`.
- `ThemeDiffEntry` + `ThemeDiffResponse` Zod contracts in `src/shared/api/contracts.ts`.
- Unit tests for the pure diff helper: no-template, equal versions, pure-add, pure-remove, modified-config.

UI (the `<ThemeUpdateDiff>` modal and the `Bijwerken van thema` button on DashboardPage) is **not** in this cycle.

## Why

PR #109 (cycle 1, this session) seeded `dashboard_templates` with `version = 1` per system theme. From this point forward, when the seeded templates' version is bumped (e.g. by a follow-up cycle that updates a theme's tiles), existing projects' `project_dashboards.source_template_version` will lag — but today there is no mechanism to propagate that. This service is the propagation channel.

Backend-first lets us land the API on main now, unblocks the cycle-3 UI, and lets curl-level testing happen immediately. Also keeps the PR small.

## Success criteria

1. `GET /api/projects/:idOrSlug/dashboards/:dashboardSlug/theme-diff` returns `{ projectVersion, templateVersion, diff: ThemeDiffEntry[] }`. Each entry is `{ kind: 'added' | 'removed' | 'modified', tileId, before?: TileConfig, after?: TileConfig }`. When the project is up-to-date (`templateVersion === projectVersion`): empty diff.
2. `POST /api/projects/:idOrSlug/dashboards/:dashboardSlug/theme-apply` with `{ tileIds: string[] }` applies only the selected entries by id. If every diff entry's `tileId` is in `tileIds`, bump `project_dashboards.source_template_version` to the template's current version; otherwise leave it behind.
3. The pure `diffTiles(project, template)` helper produces correct entries for: no-template-row (returns null/empty per chosen contract), equal-list (empty diff), pure-add (template has 1 more), pure-remove (project has 1 more), modified-config (same id, different chartType/dataSource/dimensions/title/config — deep equal). Five unit tests.
4. Read = any authenticated org member (uses `resolveProject` for org-scoping). Apply = admin/editor (uses `requireRole`).

## Approach

- **Diff identity = `tile.id`.** Modified = same id, different chartType / dataSource / dimensions / title / config (deep-equal). `description` is excluded from modification detection — copy edits don't trigger update prompts.
- **Latest template = `ORDER BY version DESC LIMIT 1` for the dashboard's `source_theme_slug`** (matches bootstrap service).
- **Apply behaviour:** rebuild `project_dashboards.tiles` from current tiles + selected diff entries. Atomic UPDATE with returning.
- **Auth pattern:** mirror existing `getProjectDashboard` / `putProjectDashboardLayout` — `resolveProject` + 404 on miss; `requireRole` middleware on apply.
- **No layout diff.** Layout is per-project ergonomic state (per cycle-11 spec); theme updates do not overwrite it.
- **No kpi_config diff.** kpi_config still lives on `themes` and is read fresh on every render.

## Not doing

- UI (`<ThemeUpdateDiff>` modal, `Bijwerken van thema` trigger on DashboardPage) — cycle 3.
- Auto-apply — always user-driven, per cycle-11 spec intent.
- Multi-dashboard projects — only the `is_default` dashboard is exposed in the UI today; this service still works per-dashboard but no UI surfaces non-default dashboards.
- Notifications when a theme version bumps — in-app surfacing only, deferred to the sync-subscriber EPIC (#108).
