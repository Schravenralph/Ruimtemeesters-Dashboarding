# Forge Spec: CBS Nieuwbouw en transformaties (86084NED) as a new data source

**Cycle:** TBD | **Clock:** 0 elapsed | **Size:** M
**Refs:** EPIC #141 (PROG-DATA: CBS Wonen data-source expansion), ADR-003
(cohort/provincie/land references on by default), ADR-006 (sync cadence
via sync_demand). Anchoring design: `2026-03-26-multi-domain-supercategories-design.md` §4.

## Table identity (corrected)

Earlier notes referenced **83487NED** — that's "Kerncijfers wijken en buurten 2016", a
**discontinued 2016-only wijk/buurt summary**, not a nieuwbouw table.
The correct table for realised nieuwbouw per gemeente is:

- **86084NED — Nieuwbouw en transformaties; kenmerken woning en bewoning op 31 december**
- Cadence: **Perjaar** (yearly), period 2018-2024
- Dimensions: `BewoningWoonruimte`, `Huishoudenskenmerken`, `Woningkenmerken`, `RegioS` (standard), `Perioden`
- Measures: `M002996` Nieuwbouw (aantal), `D007850` Woningtransformatie (aantal), `M008207` Totaal (aantal)
- v4 endpoint: `https://datasets.cbs.nl/odata/v1/CBS/86084NED`

## What

Wire 86084NED as a new data source. After this spec lands, the registry
has a `data_nieuwbouw_transformaties` source and the table holds
gemeente-level annual counts of new-build dwellings and transformations
(non-residential converted to residential).

In scope:

- New migration `049_data_nieuwbouw_transformaties_source.sql` that:
  - Creates target table `data_nieuwbouw_transformaties` with
    `(period_year, region_code, region_level, woning_kenmerk,
    nieuwbouw_count, transformatie_count, source_run_id, …)` mirroring
    `data_woningen`'s shape.
  - INSERTs a `data_sources` row with `key='nieuwbouw_transformaties'`,
    `cbs_table_id='86084NED'`, `supercategory='wonen'`, `table_name='data_nieuwbouw_transformaties'`,
    `value_column='nieuwbouw_count'`, `unit='aantal'`, JSONB `sync_config`
    using the standard `RegioS` regionDimension (no quirks), filter on
    totals for `BewoningWoonruimte`/`Huishoudenskenmerken` (we want the
    woningkenmerken split, not the bewoning/huishouden one), and a
    dimension mapping for `Woningkenmerken` → `woning_kenmerk` column.
  - Default subset filter: `allowedLevels=['gemeente']` (provincie/land
    derivable via rollup).
- README-style note in the migration header documenting the v4 endpoint
  and the multi-dimensional filtering shape (so the next dev doesn't
  trip on accidentally pulling huishoudens-by-woning rows when only
  the woningkenmerken split is wanted).
- Idempotency: `INSERT … ON CONFLICT (key) DO NOTHING`; `CREATE TABLE IF NOT EXISTS`.

## Why

- The currently-live `data_woningen` source gives stock counts but says
  nothing about flow (how the stock changed). Nieuwbouw is the
  positive-flow side of the woningvoorraad delta — pairing them
  unlocks the "is de groei genoeg om het tekort in te lopen?" question
  the woningtekort template already poses but can't yet answer at the
  flow level.
- Direct fit with Stage 1 of the roadmap (Wonen Primos-parity).
  Primos shows nieuwbouw as a primary indicator; we currently can't.
- The table includes **woningtransformaties** — addition of housing
  via conversion of existing non-residential buildings. Increasingly
  important policy lever for inner-city densification; not visible
  in any current source.

## Success criteria

1. Migration 049 applies cleanly (idempotent re-run).
2. `SELECT * FROM data_sources WHERE key='nieuwbouw_transformaties'` returns
   one row with a non-null `sync_config` referencing `cbsTable='86084NED'`,
   `regionDimension='RegioS'`, `allowedLevels=['gemeente']`.
3. `data_nieuwbouw_transformaties` table exists with a `(region_code,
   period_year, woning_kenmerk)` unique index so re-syncs upsert.
4. Manually triggering `syncGeneric('nieuwbouw_transformaties', { yearFilter: 2023 })`
   in a REPL or via the admin sync route returns a `SyncResult` with
   `rowsInserted > 0` and zero errors against the v4 CBS endpoint.
5. **Spot-check (`feedback_data_accuracy`):** row for Amsterdam (GM0363) in 2023
   in `data_nieuwbouw_transformaties` matches a manual statline.cbs.nl
   query for the same filter. Document the value + URL in the PR
   description.
6. Cohort wiring works: a query for any gemeente with
   `references=cohort,provincie,land` returns a non-empty reference
   block for the new source.

## Approach

- Mirror the existing `data_woningen` migration shape exactly. Use the
  same column types, the same `source_run_id` FK to `sync_runs`, the
  same partial indices.
- For the `sync_config` JSONB: lift the shape from an existing
  `data_sources` row (e.g. `SELECT sync_config FROM data_sources WHERE
  key='woningen'`) and adapt. Multi-dim filter pattern: pin
  `BewoningWoonruimte` and `Huishoudenskenmerken` to their respective
  totals (likely `T001100` for woonruimte, similar for huishoudens —
  verify via `/Dimensions/{id}/Codes`), allow `Woningkenmerken` to
  pass through as the split column.
- Sync schedule: do NOT create a `sync_schedules` row in this
  migration. Schedule creation comes via the sync_demand path (ADR-006)
  once a subscriber asks for it.
- PR includes a 5-line smoke section in the description showing the
  Amsterdam-2023 spot-check and the v4-endpoint header echo.

## Not doing

- BewoningWoonruimte split (bewoond / niet-bewoond / onbekend). Only
  totals stored in v1.
- Huishoudenskenmerken split (eenpersoons / meerpersoons / etc).
  Same — totals only.
- Wijk/buurt granularity. CBS publishes only `RegioS` for this table at
  the gemeente level; non-issue.
- Tile/template wiring. Adding `nieuwbouw_transformaties` to the
  woningen template is a separate cycle (~30 min once data is live).
- Sync schedule creation. Demand-driven (ADR-006).
