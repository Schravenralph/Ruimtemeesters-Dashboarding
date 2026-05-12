# Forge Spec: Seed dashboard_templates from system theme tiles

**Cycle:** 1 (this session) | **Clock:** ~0.6h elapsed | **Size:** small-medium

## What

Add migration `027_seed_dashboard_templates.sql` that inserts one `dashboard_templates` row per existing system theme. Each row carries: `tiles` JSONB aggregated from the `tiles` table for the theme, `layout` JSONB from the system default `dashboard_layouts` row (`user_id IS NULL`) if one exists else empty, `theme_slug = themes.slug`, `version = 1`, `name = themes.name`. Idempotent via `WHERE NOT EXISTS` on `theme_slug`.

Resolves [#82](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/82), child of EPIC [#106](https://github.com/Schravenralph/Ruimtemeesters-Dashboarding/issues/106).

## Why

Migration 026 made `dashboard_templates` the source-of-truth for ADR-004 project bootstrap, but the table was never seeded. `project-bootstrap.service.ts:75-100` queries the table on every project creation, gets zero rows, and runs the inline fallback path instead. Consequences:

- Cycle 11 ("Update from theme" diff/apply, spec at `forge-2026-05-11-002-update-from-theme.md`) has nothing to diff against — every project's `source_template_id` is NULL.
- Template lineage is broken: future theme improvements (kpi_config seed, layout improvements) can never reach existing projects via the version-bump path.
- The system silently runs a different code path than ADR-004 designed, which makes the bootstrap behaviour unreviewable.

## Success criteria

1. After `pnpm run migrate`, `SELECT COUNT(*) FROM dashboard_templates` returns ≥ 9 (one per existing system theme).
2. Each seeded row has `theme_slug` matching an existing theme, `version = 1`, `tiles` non-empty (where the theme has tiles).
3. Running the migration twice does not duplicate rows (idempotency).
4. `bootstrapProject(...)` with a known theme returns a `project_dashboards` row with `source_template_id IS NOT NULL` (proves the template path runs, not the fallback).

## Approach

- Single SQL migration. INSERT...SELECT from `themes`, with subqueries:
  - Tiles: `jsonb_agg(...)` over the `tiles` table joined by `theme_id`, ordered by `"order"`. Field renames match what the bootstrap service expects (`chartType`, `dataSource`, `defaultGeoLevel`).
  - Layout: lateral lookup of `dashboard_layouts.items` where `theme_id = themes.id AND user_id IS NULL` — fall back to `'[]'::jsonb` if none.
- Idempotency: `WHERE NOT EXISTS (SELECT 1 FROM dashboard_templates dt WHERE dt.theme_slug = t.slug)`.
- `name = themes.name`, `description = themes.description`, `category = 'theme'`, `is_featured = true`.

## Not doing

- Computing brand-new default layouts beyond what `dashboard_layouts WHERE user_id IS NULL` already contains. Themes without a system layout get empty layout (current bootstrap fallback).
- Modifying `project-bootstrap.service.ts` — it already reads from `dashboard_templates` correctly.
- Backfilling existing `project_dashboards` rows (their `source_template_id` stays NULL; only new projects benefit).
- Any change to tile contents, chart types, or `kpi_config` (those are issues #83 + #84, separate cycles).
