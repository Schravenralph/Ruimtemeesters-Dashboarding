# Forge Spec: CBS Bouwvergunningen woonruimten (83671NED) as a new data source

**Cycle:** TBD | **Clock:** 0 elapsed | **Size:** M
**Refs:** EPIC #141 (PROG-DATA: CBS Wonen data-source expansion), ADR-003
(cohort/provincie/land references on by default), ADR-006 (sync cadence
via sync_demand).

## Table identity (corrected)

Earlier notes referenced 83451NED (not present in CBS catalog) and
81955NED (that's the *Voorraad woningen* table we already sync as
`data_woningen` — wrong). The correct table for housing permits is:

- **83671NED — Bouwvergunningen woonruimten; type, opdrachtgever, eigendom, gemeente**
- Cadence: **Perkwartaal** (quarterly), period 2012 Q1 - 2025 Q4
- Dimensions: `Eigendom`, `Opdrachtgever`, `RegioS` (standard), `Perioden`
- v4 endpoint: `https://datasets.cbs.nl/odata/v1/CBS/83671NED`

Note: quarterly cadence means the period column needs to store
quarter-resolution timestamps, not just year. Decide a normalization:
either (a) keep quarterly rows with `period_year` + `period_quarter`,
or (b) aggregate to year at sync time for cross-source comparability
with the yearly nieuwbouw + WOZ sources. Recommended: **(a) keep
quarterly** — view-time aggregation is cheap, lossy collapse at sync
time is not reversible.

## What

Wire 83671NED as a new data source. After this spec lands, the registry
has a `data_bouwvergunningen_woonruimten` source giving gemeente-level
quarterly permit counts per (Eigendom × Opdrachtgever) split — the
*leading indicator* in the permit → start → realisatie pipeline.

In scope:

- New migration `051_data_bouwvergunningen_woonruimten_source.sql` that:
  - Creates target table `data_bouwvergunningen_woonruimten` with
    columns `(period_year, period_quarter, region_code, region_level,
    eigendom_type, opdrachtgever_type, num_dwellings_permitted,
    source_run_id, …)`.
  - INSERTs a `data_sources` row with `key='bouwvergunningen_woonruimten'`,
    `cbs_table_id='83671NED'`, `supercategory='wonen'`,
    `table_name='data_bouwvergunningen_woonruimten'`,
    `value_column='num_dwellings_permitted'`, `unit='aantal'`, JSONB
    `sync_config` using standard `RegioS` regionDimension and dimension
    mappings for `Eigendom` → `eigendom_type` and `Opdrachtgever` →
    `opdrachtgever_type`.

## Why

- Bouwvergunningen are the earliest signal in the housing pipeline.
  Pairing them with nieuwbouw (realised completions, spec #005) yields
  the realisatieratio — "what % of permitted dwellings actually got
  built?" — which is a top-tier wethouder-level indicator that
  Primos surfaces and we currently can't.
- Completes the three-step pipeline view (vergunning → nieuwbouw →
  voorraad) for the Wonen supercategory.
- Quarterly cadence is genuinely useful here — bouwvergunningen are
  the most volatile (i.e. most informative) housing-flow signal,
  and the within-year pattern reveals policy responses faster than
  yearly aggregates.

## Success criteria

1. Migration 051 applies cleanly (idempotent).
2. `data_sources` row exists with the correct `cbs_table_id='83671NED'`
   and valid `sync_config`.
3. Target table exists with a `(region_code, period_year,
   period_quarter, eigendom_type, opdrachtgever_type)` unique index for
   upserts.
4. `syncGeneric('bouwvergunningen_woonruimten', { yearFilter: 2024 })`
   against v4 returns `rowsInserted > 0` with zero errors.
5. **Spot-check (`feedback_data_accuracy`):** Amsterdam (GM0363) permit
   count for 2024 totals (sum over quarters, Eigendom=totaal,
   Opdrachtgever=totaal) matches statline.cbs.nl for the same filter.
   Document the value + URL in the PR description.
6. Sanity: permitted ≥ realised (in the same year) for most
   gemeenten. If reversed, suspect dimension mapping confusion.
7. Cohort wiring: `references=cohort,provincie,land` returns plausible
   references when querying a focal gemeente.

## Approach

- Same shape as the nieuwbouw spec (#005) — config-driven, no
  per-source code path.
- **Period storage decision:** the existing `data_*` tables I've
  inspected use a single `period_year INT` column. Either (a) extend
  this source to use `period_year` + `period_quarter` (cleaner), or
  (b) encode quarter into the year column as `2024.1`, `2024.2`, etc.
  Decision: (a) explicit `period_quarter INT NULL` column. The sync
  parser already handles CBS quarter codes (`2024KW01` etc).
- Verify `parseCbsPeriod` handles quarter codes correctly during the
  build phase — if not, that's a tiny patch to `cbs-client.ts`.
- PR description includes table-ID note + Amsterdam-2024 spot-check.

## Not doing

- Bouwkosten (cost) data. Not in this table; available in
  83673NED if needed later.
- Permits for non-residential (bedrijfsgebouwen / utiliteitsbouw).
  That's the 83672NED domain — separate spec under a future
  non-residential expansion if ever needed.
- Combining vergunning + nieuwbouw into a single "realisatieratio"
  computed column at sync time. Derive at view-time; storing
  ratios at sync time creates stale-aggregate bugs.
- Sync schedule wiring (demand-driven, ADR-006).
- Frontend tile/template wiring. Separate cycle.
