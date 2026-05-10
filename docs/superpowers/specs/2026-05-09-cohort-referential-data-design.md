# Cohort Definitions + Referential Data Layer

**Date:** 2026-05-09
**Status:** Approved
**Implements:** ADR-003 §"Cohort definitions" and §"Schema"

## Summary

Build the data layer that makes per-municipality drilldown comparable. For every gemeente, store its membership in three cohort types (stedelijkheid, populatiegrootte, woningmarktregio). Serve cohort metadata via `/api/cohorts/:gemeenteCode` and inline reference aggregates (cohort mean, provincial mean, national mean — optionally p25/p75 envelope) via `/api/data/query?references=cohort,provincie,land`.

This is the prerequisite for SPEC-B (chart rendering) and Stage 1 of the roadmap.

## Success Criteria

| Metric | Threshold |
|--------|-----------|
| Cohort types ingested | 3 (stedelijkheid, populatiegrootte, woningmarktregio) |
| Cohort memberships rows | ≥ 836 gemeenten × 3 = ~2,500 (every gemeente in every cohort type) |
| Krimp/anticipeer rows (4th cohort type, low-priority) | ~40 gemeenten across 9 krimp + ~17 anticipeer regio's |
| `/api/cohorts/:gemeenteCode` p95 latency | < 50 ms |
| `/api/data/query?references=...` round-trips per chart | 1 |
| `references` block round-trip overhead vs no-refs | < 30 % p95 |
| Provenance per cohort definition | `source` + `source_vintage` non-null |
| Backwards compatibility | All existing `/api/data/query` callers work unchanged when `references` param absent |
| TypeScript | 0 errors (both tsconfigs) |
| Tests | Unit: ingest mapping; aggregate computation; endpoint contract. Integration: round-trip with seeded data. |

## Schema

Migration `024_cohort_definitions.sql`:

```sql
CREATE TABLE cohort_definitions (
  cohort_type      VARCHAR(50) NOT NULL,           -- 'stedelijkheid' | 'populatiegrootte' | 'woningmarktregio' | 'krimp_anticipeer'
  cohort_key       VARCHAR(100) NOT NULL,          -- e.g. 'stedelijkheid_3', 'popbin_50_100k', 'wmr_amsterdam'
  name             VARCHAR(255) NOT NULL,          -- NL human-readable label
  description      TEXT,
  source           VARCHAR(255) NOT NULL,          -- e.g. 'CBS 86059NED', 'Rijksoverheid 2019 PDF'
  source_url       TEXT,
  source_vintage   DATE NOT NULL,                  -- when the source was extracted
  theme_default_for TEXT[] DEFAULT '{}',           -- theme slugs where this cohort type is the default
  sort_order       INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (cohort_type, cohort_key)
);

CREATE TABLE cohort_members (
  cohort_type   VARCHAR(50) NOT NULL,
  cohort_key    VARCHAR(100) NOT NULL,
  geo_code      VARCHAR(10) NOT NULL REFERENCES geo_areas(code) ON DELETE CASCADE,
  PRIMARY KEY (cohort_type, cohort_key, geo_code),
  FOREIGN KEY (cohort_type, cohort_key) REFERENCES cohort_definitions(cohort_type, cohort_key) ON DELETE CASCADE
);

CREATE INDEX idx_cohort_members_geo ON cohort_members(geo_code);
CREATE INDEX idx_cohort_members_lookup ON cohort_members(cohort_type, geo_code);
```

Cohort membership is **per-cohort-type 1-to-1**: each gemeente belongs to exactly one cohort_key per cohort_type. Krimp_anticipeer is the exception — gemeenten not in any krimp/anticipeer regio simply have no row for that cohort_type (their cohort comparison falls back to provincie + national only).

Default cohort type per supercategory (seeded into `theme_default_for`):
- Wonen → `woningmarktregio`
- Duurzaamheid, Economie, Mobiliteit, Veiligheid → `populatiegrootte`

## Ingestion

### CBS 86059NED — stedelijkheid + woningmarktregio

`src/server/services/cbs/cbs-sync-cohorts.ts` — new module. One ingestion pass yields both cohort types from a single CBS table.

```typescript
interface CohortIngestResult {
  cohortType: string;
  definitionsUpserted: number;
  membersUpserted: number;
}

export async function syncCohortsFromCbs86059(): Promise<CohortIngestResult[]>
```

Steps:
1. Fetch `https://opendata.cbs.nl/ODataApi/odata/86059NED/TypedDataSet?$filter=...` filtered to gemeenten only.
2. Map columns:
   - `Stedelijkheid` (1–5) → cohort_key `stedelijkheid_<n>` (label: "Zeer sterk stedelijk", "Sterk stedelijk", "Matig stedelijk", "Weinig stedelijk", "Niet stedelijk").
   - `WoningmarktregioStatutair` (or whatever CBS calls it; verify against the live OData schema before implementation) → cohort_key `wmr_<slug>` (label = region name).
3. Compute `populatiegrootte` cohort by joining the gemeente list with `data_bevolking` totals for the latest year:
   - bins: `popbin_lt_20k`, `popbin_20_50k`, `popbin_50_100k`, `popbin_100_250k`, `popbin_g4` (Amsterdam, Rotterdam, Den Haag, Utrecht).
4. UPSERT into `cohort_definitions` and `cohort_members` within a transaction.
5. Return per-cohort-type counts.

### Krimp / anticipeer — static CSV

`data/cohorts/krimp-anticipeer-2019.csv` — committed file, manually curated from the 2019 Rijksoverheid PDF (`https://www.rijksoverheid.nl/documenten/publicaties/2019/07/25/indeling-gemeenten-krimpregios-en-anticipeerregios-per-1-januari-2019`). Columns: `geo_code, cohort_key, name`.

`syncCohortsFromCsv(path)` reads the file and UPSERTs. Idempotent.

### Schedule

Register a `sync_schedules` row (migration 019) for cohort recompute, cron `0 4 1 1 *` (yearly, 04:00 on 1 Jan). Honours the global-pull rule (`project_data_pull_vs_view.md`): cohorts are global, not per-org.

## API

### `GET /api/cohorts/:gemeenteCode`

Returns the focal gemeente's memberships across all cohort types, with the cohort definition + member list.

Response shape (Zod-defined in `contracts.ts`):

```typescript
interface CohortMembershipsResponse {
  geoCode: string;
  memberships: Array<{
    cohortType: 'stedelijkheid' | 'populatiegrootte' | 'woningmarktregio' | 'krimp_anticipeer';
    cohortKey: string;
    name: string;                     // human-readable label
    description: string | null;
    source: string;
    sourceUrl: string | null;
    sourceVintage: string;            // ISO date
    members: string[];                // gemeente codes in this cohort
    memberCount: number;
  }>;
  defaultByTheme: Record<string, string>; // theme_slug → cohort_type
}
```

### `GET /api/data/query?…&references=cohort,provincie,land[&cohortType=…][&envelope=true]`

Existing endpoint extended. New params:

- `references` — comma-separated subset of `cohort | provincie | land`. Absent → no references block (back-compat).
- `cohortType` — overrides the default cohort type for the focal gemeente (defaults to the per-supercategory default).
- `envelope` — if `true`, include p25/p50/p75 alongside mean for the cohort series.

Response gains a `references` block:

```typescript
interface ReferencesBlock {
  cohort?: { cohortKey: string; cohortName: string; series: SeriesPoint[]; envelope?: { p25: SeriesPoint[]; p50: SeriesPoint[]; p75: SeriesPoint[] } };
  provincie?: { geoCode: string; geoName: string; series: SeriesPoint[] };
  land?: { series: SeriesPoint[] };  // always 'NL'
}
```

Aggregates are computed server-side via SQL (`AVG(value)` over cohort_members joined to the data table for the same dimensions/year/source filters).

### Caching

- `cohort_definitions` + `cohort_members` cached in-process for 60 s (same TTL pattern as `data_sources` registry per migration 012 §"Controller Change").
- `/api/data/query` HTTP cache key includes the new params.

## Implementation Tasks

### Task 1 — Migration 024
Add `cohort_definitions` + `cohort_members` tables. No data yet.

### Task 2 — CBS 86059NED ingestor
New `syncCohortsFromCbs86059()` in `src/server/services/cbs/cbs-sync-cohorts.ts`. Includes stedelijkheid + woningmarktregio + populatiegrootte (computed from `data_bevolking` totals). Idempotent UPSERT.

### Task 3 — Krimp/anticipeer CSV ingestor
Commit `data/cohorts/krimp-anticipeer-2019.csv`. Add `syncCohortsFromCsv(path)`. Wire both into the CLI (`pnpm run sync:cohorts`).

### Task 4 — Sync schedule registration
Insert a `sync_schedules` row for `cohorts` source, yearly cron. Re-uses migration 019 infra.

### Task 5 — Cohort controller + routes
`src/server/controllers/cohort.controller.ts`, `src/server/routes/cohort.routes.ts`. Implements `GET /api/cohorts/:gemeenteCode`. Returns 404 if gemeente has no memberships at all (treat as misconfigured), otherwise returns whatever memberships exist (krimp may be absent legitimately).

### Task 6 — Extend `data.controller.ts` with references
Add `references`, `cohortType`, `envelope` query-param parsing. For each requested reference, run an additional SQL aggregate (cohort: `AVG(value) WHERE geo_code IN (cohort_members)`; provincie: `WHERE geo_code = (parent provincie)`; land: `WHERE geo_code = 'NL'`). Bundle into the `references` block. All within the same controller invocation.

### Task 7 — Shared contract types
Add `CohortMembership`, `CohortMembershipsResponse`, `ReferencesBlock`, `ReferenceSeries` to `src/shared/api/contracts.ts` with Zod schemas. Update existing `DataQueryResponse` to optionally include `references`.

### Task 8 — Tests
- Unit: cohort mapping (CBS code → cohort_key), populatiegrootte binning, krimp CSV parsing.
- Unit: aggregate computation (cohort mean, envelope quantiles) on synthetic data.
- Integration: end-to-end ingest → query with `references=cohort,provincie,land` → assert response structure + values for known gemeenten (e.g. Amsterdam).
- Contract: `CohortMembershipsResponse` and extended `DataQueryResponse` Zod parsing.

### Task 9 — Admin surface
Extend the existing AdminPage Datakwaliteit tab (PR #56) with a "Cohorts" section: row count per cohort_type, last sync vintage, missing-membership warnings. Out-of-scope cosmetic changes deferred.

## Validation Plan

1. Run `pnpm run sync:cohorts` against a clean DB. Verify ~2,500 cohort_members rows + 30-ish cohort_definitions rows.
2. `curl /api/cohorts/GM0363` (Amsterdam) → expect memberships in stedelijkheid (likely "1 — zeer sterk"), populatiegrootte ("popbin_g4"), woningmarktregio ("wmr_amsterdam"). Member counts non-zero.
3. `curl /api/data/query?source=bevolking&geoCode=GM0363&year=2024&references=cohort,provincie,land` → response includes `references` block with three named series, all numeric.
4. `&envelope=true` → cohort series gains `envelope.{p25,p50,p75}`.
5. p95 latency benchmark: 100 sequential calls to `/api/cohorts/:gemeenteCode` and `/api/data/query?references=...` — record p50/p95.
6. Negative path: non-existent gemeente → 404; gemeente with no krimp_anticipeer membership → response omits that membership rather than failing.
7. Re-run `sync:cohorts` → no duplicates, no FK violations (idempotency).

## Files to Create/Modify

- `src/server/db/migrations/024_cohort_definitions.sql` — NEW
- `src/server/services/cbs/cbs-sync-cohorts.ts` — NEW
- `src/server/db/sync-cohorts.ts` — NEW (CLI entry)
- `data/cohorts/krimp-anticipeer-2019.csv` — NEW
- `src/server/controllers/cohort.controller.ts` — NEW
- `src/server/routes/cohort.routes.ts` — NEW
- `src/server/app.ts` — register cohort routes
- `src/server/controllers/data.controller.ts` — extend with `references` param
- `src/shared/api/contracts.ts` — Cohort + References Zod types
- `src/server/services/cbs/cbs-sync-cohorts.test.ts` — NEW
- `src/server/controllers/cohort.controller.test.ts` — NEW
- `src/server/controllers/data.controller.references.test.ts` — NEW
- `package.json` — add `sync:cohorts` script

## Non-Goals

- AMIGO-style multi-feature similarity cohort (deferred to v2 per ADR-003).
- User-defined cohorts.
- Time-varying cohort membership (current-year membership applied across all years).
- Per-tile cohort overrides — handled at the chart layer in SPEC-B, not here.
