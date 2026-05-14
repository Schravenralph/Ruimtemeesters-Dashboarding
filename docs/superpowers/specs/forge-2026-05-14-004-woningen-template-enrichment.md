# Forge Spec: Make the Woningen template actually usable

**Cycle:** 4 | **Clock:** ~30m elapsed | **Size:** M
**Refs:** Issue #106 EPIC (theme template audit & gap closure), ADR-002
("a theme is not 'shipped' until it has a working prebuilt dashboard"),
ADR-003 (cohort/provincie/land references on by default).

## What

Rewrite the `woningen` system template into a sensible, advisor-facing
dashboard backed by data already in this database. Today the row in
`dashboard_templates` has 4 tiles with no layout, no descriptions, and
a single KPI — when an advisor picks it from the Systeem tab the result
is an unpositioned grid with a one-line topline.

In scope:

- **9-tile layout** for the Woningen theme covering five questions a
  housing advisor actually asks:
  1. *"Hoe groot is mijn woningvoorraad en hoe verhoudt die zich tot
     de cohort?"* — KPI strip (woningvoorraad, woningtekort, % eengezins,
     huishoudens/woning ratio) + a stacked bar by eigendomstype.
  2. *"Is de mismatch tussen vraag (huishoudens) en aanbod (woningen)
     groter of kleiner aan het worden?"* — line of `huishoudens / woningen`
     over time, with cohort + provincie + land overlays per ADR-003.
  3. *"Welk type woning groeit / krimpt sterker?"* — line over time
     by dwelling_type (eengezins vs meergezins), absolute + delta.
  4. *"Hoe staat het ervoor in de regio?"* — choropleth of
     woningvoorraad per gemeente, plus tabel met top-10
     groei/krimp-gemeenten.
  5. *"Wat zegt de prognose?"* — line met `ruimtemeesters_prognose`
     bron + p25/p75 envelope (TSA Engine — only source met
     confidence bounds per project_forecast_confidence.md).
- **References on by default** (cohort + provincie + land) — fills
  the ADR-003 promise from day-one of the template.
- **Per-tile description** in Dutch so advisors know what each chart
  answers without hover-hunting.
- **4-KPI strip** instead of the current single KPI: woningvoorraad,
  woningtekort, % eengezinswoningen, huishoudens-per-woning ratio.

## Why

- `dashboard_templates.woningen` is the load-bearing template for the
  most-requested gemeente concern (housing shortage). It's currently
  the lowest-effort step from "advisor picks template" to "they show
  it to a wethouder", and we're shipping it with empty layout.
- All 9 tiles draw from data already in the warehouse — no new sync
  to set up, no CBS calls to wire. The lift is purely tile+layout+KPI
  configuration. **Highest ratio of advisor value per dev-minute** in
  the open backlog right now.
- Closes a real gap in the 2026-05-12 evening report's
  "next session" priorities (#2 visual smoke flagged that the system
  templates were unverified, but the deeper truth is they're
  unrenderable, not just unverified).

## Success criteria

1. Migration 035 applies cleanly to an existing DB with no manual
   intervention. Idempotent (uses `WHERE NOT EXISTS` or UPDATE patterns
   so re-run is safe).
2. `SELECT jsonb_array_length(tiles), jsonb_array_length(layout) FROM
   dashboard_templates WHERE theme_slug='woningen'` returns
   `(9, 9)` after the migration.
3. The `themes` row for woningen gets the updated `kpi_config` (4 entries)
   and a `config -> references` default set.
4. Loading `/dashboard/woningen` (or the closest equivalent) in the
   running container after rebuild shows 9 positioned tiles with
   visible cohort/provincie/land overlays where the chart type supports it.
5. `GET /api/data/query?source=woningen&geoCode=GM0363&year=2024` still
   returns Amsterdam's 480 852 woningen — i.e. no data-path regression.

## Approach

- One migration file `035_enrich_woningen_template.sql` writing both
  `themes.kpi_config` (UPDATE) and `dashboard_templates.tiles/layout`
  (UPDATE) for `theme_slug='woningen'`. Idempotent via UPDATE…WHERE.
- The 9 tile records are inlined as JSONB literals; layout uses
  react-grid-layout's `{i, x, y, w, h}` shape with a 12-column grid
  matching the rest of the app (verified by grepping
  `src/client/components/dashboard/DashboardLayout`).
- Per-tile JSON includes `config.references = ['cohort','provincie','land']`
  so the renderer enables them without extra wiring (per ADR-003 the
  layer reads this field).
- After migration, smoke via `/api/data/query` with `references=cohort,provincie,land`
  to confirm the references block is non-empty for at least one tile.

## Not doing

- Adding new CBS data sources (nieuwbouw 83487NED, WOZ-waarde 84717NED).
  Those need a new target table + sync routine and are the *next*
  cycle, not this one.
- Visual screenshot smoke. UI-rendering verification is the
  "next session priority #2" task and is a separate skill (`visual-smoke-test`).
- Changing the `tiles` table (theme-level tiles used by the
  custom-dashboard editor). The template-level tiles in
  `dashboard_templates.tiles` are what the wizard bootstrap uses; the
  `tiles` table feeds the tile-picker for free-form editing. These
  serve different surfaces and shouldn't be conflated.
