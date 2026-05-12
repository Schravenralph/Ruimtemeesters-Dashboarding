# Forge Spec: Theme readiness admin view

**Cycle:** 4 (this session) | **Clock:** ~2.0 h elapsed | **Size:** medium

## What

Resolves [#86](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/86), child of EPIC [#106](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/106). Surfaces an empirical "is this theme shipped per ADR-002?" view to platform admins.

Adds:

- `GET /api/admin/themes/readiness` — admin-only — returns one row per theme with: `slug, name, supercategory, tileCount, kpiConfigCount, templateSeeded, templateVersion, distinctDataSources, shipped` (boolean per ADR-002 bar).
- `<ThemeReadiness>` admin component with a sortable table.
- New "Themaprestatie" tab in AdminPage.
- A pure `isThemeShipped(entry)` helper exported for unit testing.

## Why

The audit on 2026-05-12 (which seeded this session's work) was done by hand — no surface in the app answers "is theme X shipped?" empirically. After PRs #109/#110/#111 closed the cycle-11 loop, the next operational gap is: how does an admin know which themes still need work? Without this view, every audit has to be repeated manually.

## Success criteria

1. `GET /api/admin/themes/readiness` requires admin role; returns an array of theme readiness entries.
2. New AdminPage tab "Themaprestatie" renders the readiness table sortable by any column; shows shipped/partial/broken per theme at a glance.
3. `isThemeShipped(entry)` returns true iff `tileCount > 0` AND `templateSeeded` AND `kpiConfigCount > 0` AND `distinctDataSources.length > 0`. Three unit tests cover shipped / partial-tile-only / no-template.
4. Build + suite stay green; no regression on the existing AdminPage tabs.

## Approach

- One SQL query joining `themes` (left join tile counts via subquery, left join dashboard_templates for `templateSeeded` + `templateVersion`, JSON aggregate of distinct `data_source` from tiles). Order by `supercategory, "order"`.
- Backend logic minimal — heavy lifting in SQL. The `shipped` flag is computed server-side from the same source data, but the pure helper is exported for unit testing the rule.
- Frontend table follows the existing `<DataQualityPanel>` table style (header + rows + status chip).

## Not doing

- Cohort wiring status per theme (deferred — needs a separate join against `cohort_definitions.theme_default_for` which isn't shaped for theme→cohort lookup yet).
- Last sync timestamp / status (deferred — would require a second aggregate query against `sync_runs` keyed by theme's data sources).
- Click-through drill-down per theme (deferred — UI is read-only summary in v1).
- Auto-refresh / live updates (deferred — page refresh is enough).
- Writeback affordances (creating tiles, editing kpi_config from this view) — that's the existing ThemeManager tab.
