# Design: Primos Parity — 5 High-Priority Features

**Date:** 2026-03-23
**Status:** Approved
**Author:** Claude Opus 4.6 + Ralph

---

## Overview

Five features to close the most impactful gaps between our dashboard and Primos Datawonen. Each feature is independently implementable but they share a coherent design.

### Features

1. Age group realignment + huishoudens per leeftijd referentiepersoon
2. Multiple presentation tabs with per-tab filter state
3. Inline vergelijkingsniveau (comparison against higher geo level)
4. CBS regional projections (table 84528NED)
5. CBS data re-sync with corrected age groups

---

## 1. Age Group Realignment

### Problem

Our age groups (`0-14, 15-24, 25-44, 45-64, 65-79, 80+`) differ from Primos (`0-14, 15-29, 30-44, 45-64, 65-74, 75+`). Users cross-referencing with Primos outputs cannot directly compare values.

### Change

Update `ageToGroup()` in `src/server/services/cbs/cbs-sync.ts`:

```
Before:                    After (Primos-aligned):
0-14   → 0-14             0-14   → 0-14
15-24  → 15-24            15-29  → 15-29
25-44  → 25-44            30-44  → 30-44
45-64  → 45-64            45-64  → 45-64
65-79  → 65-79            65-74  → 65-74
80+    → 80+              75+    → 75+
```

CBS raw data has individual ages (0, 1, 2, ... 105+), so we simply change the aggregation boundaries. No schema change — `age_group` is VARCHAR.

### Data cleanup (required)

Old age group values (`15-24`, `25-44`, `65-79`, `80+`) will remain in the database as orphans since the new groups have different keys. Before re-sync:

```sql
DELETE FROM data_bevolking WHERE age_group IN ('15-24', '25-44', '65-79', '80+');
```

Alternatively, truncate and re-sync the full table.

### Affected files

- `src/server/services/cbs/cbs-sync.ts` — `ageToGroup()` function
- `src/client/utils/format.ts` — `dimensionValueLabel()` mappings
- `src/client/utils/i18n.ts` — if age group labels are translated

### Tests to update

- `src/shared/api/contracts.test.ts` — any tests referencing old age group strings
- `src/client/utils/format.test.ts` — `dimensionValueLabel` tests
- New: unit test for `ageToGroup()` with boundary values (14→0-14, 15→15-29, 29→15-29, 30→30-44, etc.)

### After change

Run cleanup SQL, then `pnpm run sync:cbs` to re-aggregate all data with new groupings.

---

## 2. Huishoudens per Leeftijd Referentiepersoon

### Problem

Primos shows households broken down by age of reference person (≤29, 30-44, 45-64, 65-74, 75+). We only have breakdown by household composition (alleenstaand, paar, eenouder, etc.).

### Data source

CBS table `71486ned` has a `LeeftijdReferentiepersoon` dimension. We currently filter to code `'10000'` (all ages).

### Pre-implementation task

Fetch and document the actual CBS codes before implementation:
```
GET https://datasets.cbs.nl/odata/v1/CBS/71486ned/LeeftijdReferentiepersoonCodes
```
Map each CBS code to a Primos age group. Document the explicit mapping in the sync code as a constant object (not runtime discovery).

### Database approach

Add a `dimension_type` discriminator column to `data_huishoudens`:

```sql
-- Migration 010
ALTER TABLE data_huishoudens ADD COLUMN IF NOT EXISTS dimension_type VARCHAR(50) DEFAULT 'samenstelling';
```

Values:
- `'samenstelling'` — existing composition data (alleenstaand, paar, etc.)
- `'leeftijd_referentiepersoon'` — new age-of-reference-person data

This avoids mixing two semantically different dimensions in the `household_type` column and keeps existing queries clean without needing `NOT LIKE` guards.

### Sync change

Add a second pass in `syncHuishoudens()`:
1. For each Primos age group, query CBS with the corresponding `LeeftijdReferentiepersoon` code
2. Store with `household_type = '0-29'`, `'30-44'`, `'45-64'`, `'65-74'`, `'75+'` and `dimension_type = 'leeftijd_referentiepersoon'`

### Unique constraint update

The existing unique constraint is `UNIQUE(geo_code, year, household_type)`. This must be updated:

```sql
-- In migration 010
ALTER TABLE data_huishoudens DROP CONSTRAINT IF EXISTS data_huishoudens_geo_code_year_household_type_key;
ALTER TABLE data_huishoudens ADD CONSTRAINT data_huishoudens_unique
  UNIQUE(geo_code, year, household_type, dimension_type);
```

Update all ON CONFLICT clauses in `syncHuishoudens()` accordingly.

### UI impact

- Drilldown panel shows "Leeftijd referentiepersoon" as a selectable dimension
- Data controller filters by `dimension_type` when querying
- Existing household composition queries add `WHERE dimension_type = 'samenstelling'` (or default)

### Tests

- New: sync test validating age code mapping
- New: data controller test filtering by dimension_type
- Update: existing huishoudens contract tests

---

## 3. Multiple Presentation Tabs

### Problem

Users can only view one theme/variable at a time. Primos allows multiple independent presentations open as tabs, each with its own variable, geo level, and period.

### Architecture

#### New: PresentationContext

Replaces the role of `FilterContext` as the primary state holder.

```typescript
interface Presentation {
  id: string
  title: string                          // auto: "Bevolking - 2024 - Gemeenten"
  themeSlug: string
  filters: FilterState
  chartType: ChartType                   // uses existing ChartType enum
  transformation: TransformationType
  transformationOptions?: {
    groeicijferType?: 'absoluut' | 'relatief' | 'index'
    baseYear?: number
  }
  classificationBreaks?: ClassBreak[]
}

interface PresentationContextValue {
  presentations: Presentation[]
  activeId: string | null
  activePresentation: Presentation | null

  addPresentation: (config?: Partial<Presentation>) => string  // returns id
  removePresentation: (id: string) => void
  setActive: (id: string) => void
  updatePresentation: (id: string, updates: Partial<Presentation>) => void

  // Max 10 tabs
}
```

Note: `chartType` uses the existing `ChartType` enum from `contracts.ts` (`bar`, `table`, `choropleth`, etc.) — not a separate `presentationType` concept.

#### FilterContext becomes a pass-through

```typescript
// FilterContext internally delegates to active presentation's filters:
function useFilters() {
  const { activePresentation, updatePresentation } = usePresentations()
  // All getters read from activePresentation.filters
  // All setters call updatePresentation(activeId, { filters: {...} })
}
```

This preserves backward compatibility — every existing component that calls `useFilters()` continues to work without changes.

#### Tab bar component

New `PresentationTabBar` component rendered below the toolbar:

- Each tab shows: title (truncated) + close button (×)
- Active tab highlighted with blue bottom border
- "+" button opens SelectionWizard or creates blank tab
- Max 10 tabs enforced
- Cannot close the last remaining tab

#### Persistence

Tab state is persisted to `sessionStorage` to survive page refreshes:
- Key: `ruimtemeesters_presentations`
- Serialized as JSON array of `Presentation` objects
- Loaded on app start; falls back to single default tab if missing/corrupt
- Size limit: ~5MB in sessionStorage is sufficient for 10 tabs

#### URL routing

- `/dashboard/:slug` creates or activates a tab for that slug
- Sharing via URL shares the active tab's configuration only

### Affected files

- New: `src/client/contexts/PresentationContext.tsx`
- Modified: `src/client/contexts/FilterContext.tsx` — becomes pass-through
- New: `src/client/components/ui/PresentationTabBar.tsx`
- Modified: `src/client/components/ui/Layout.tsx` — add tab bar
- Modified: `src/client/pages/DashboardPage.tsx` — create/activate tab on slug change
- Modified: `src/client/App.tsx` — wrap with PresentationProvider

### Tests

- New: `PresentationContext.test.tsx` — add/remove/switch tabs, max enforcement, persistence
- Update: `FilterContext.test.tsx` — verify pass-through behavior
- New: `PresentationTabBar.test.tsx` — render, click, close

---

## 4. Inline Vergelijkingsniveau

### Problem

Users see absolute values for a gemeente but lack context — is Amsterdam's growth high or low relative to its province or the national average?

### Filter state extension

```typescript
// In contracts.ts FilterState schema — add with .default(null):
comparisonLevel: z.enum(['land', 'provincie', 'corop', 'gemeente', 'wijk', 'buurt']).nullable().default(null),
comparisonGeoCode: z.string().nullable().default(null),
```

Backward compatibility: persisted `saved_filters` rows that lack these fields will parse fine because of `.default(null)`. The Zod schema handles missing fields gracefully.

### Data fetching

Client-side: when comparison is enabled, `useDataQuery` makes a second parallel `queryData()` call for the comparison area. The comparison data is a single area, so the request is trivial.

```typescript
// New hook: useComparisonQuery
const comparisonData = useDataQuery({
  source,
  geoCode: filters.comparisonGeoCode,
  year: filters.period.year,
  enabled: !!filters.comparisonLevel && !!filters.comparisonGeoCode,
})
```

No new API endpoints needed.

### Display per presentation type

| Presentation type | Comparison display |
|---|---|
| Table | Highlighted reference row at top, light blue background, labeled "Gem. Noord-Holland" or "Nederland" |
| ColorTable | Same highlighted reference row |
| Bar/Column chart | Dashed horizontal reference line at comparison value, labeled |
| Line chart | Second dashed line series for comparison area |
| Map | Not applicable (already shows all areas) |
| Pie/Radar | Not applicable |

### UI controls

New section in FilterBar: "Vergelijken met"
- Toggle to enable/disable
- Level selector dropdown: "Nederland", "Provincie", "COROP"
- Area selector (only shown for Provincie/COROP): dropdown of areas at that level
- When level is "land", auto-select "NL" — no area dropdown needed

### Per-tab state

Comparison settings are stored in each presentation's `FilterState`, so different tabs can have different comparisons.

### Affected files

- Modified: `src/shared/api/contracts.ts` — add comparison fields to FilterState with `.default(null)`
- Modified: `src/client/contexts/FilterContext.tsx` — add comparison setters
- Modified: `src/client/components/filters/FilterBar.tsx` — add comparison UI
- New: `src/client/hooks/useComparisonQuery.ts`
- Modified: chart components that support comparison — add reference line/row rendering

### Tests

- Update: `FilterContext.test.tsx` — comparison setters
- Update: `contracts.test.ts` — FilterState with comparison fields
- New: `useComparisonQuery` hook test

---

## 5. CBS Regional Projections

### Problem

We only have CBS actuals (historical data up to 2024). Primos shows forecasts to 2050. While we can't replicate ABF's proprietary model, CBS publishes their own regional projections.

### Data source

CBS table `84528NED` — "Regionale bevolkings- en huishoudensprognose"
- Province and COROP level (not gemeente)
- Population and households
- Projections to ~2050
- Updated roughly every 2 years

### Database change

New migration `009_data_source_column.sql`:

```sql
-- Add source column to all data tables
ALTER TABLE data_bevolking ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';
ALTER TABLE data_huishoudens ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';
ALTER TABLE data_woningen ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';
ALTER TABLE data_woningtekort ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';

-- Update unique constraints to include source column.
-- This allows the same (geo_code, year, age_group, gender) to exist
-- for both 'cbs_actuals' and 'cbs_prognose'.
ALTER TABLE data_bevolking DROP CONSTRAINT IF EXISTS data_bevolking_geo_code_year_age_group_gender_key;
ALTER TABLE data_bevolking ADD CONSTRAINT data_bevolking_unique
  UNIQUE(geo_code, year, age_group, gender, source);

ALTER TABLE data_woningen DROP CONSTRAINT IF EXISTS data_woningen_geo_code_year_tenure_type_dwelling_type_key;
ALTER TABLE data_woningen ADD CONSTRAINT data_woningen_unique
  UNIQUE(geo_code, year, tenure_type, dwelling_type, source);

ALTER TABLE data_woningtekort DROP CONSTRAINT IF EXISTS data_woningtekort_geo_code_year_metric_key;
ALTER TABLE data_woningtekort ADD CONSTRAINT data_woningtekort_unique
  UNIQUE(geo_code, year, metric, source);

-- Note: data_huishoudens constraint is updated in migration 010 (feature 2)
-- to include both dimension_type and source.

-- Add index on source for filtered queries
CREATE INDEX IF NOT EXISTS idx_bevolking_source ON data_bevolking(source);
CREATE INDEX IF NOT EXISTS idx_huishoudens_source ON data_huishoudens(source);
CREATE INDEX IF NOT EXISTS idx_woningen_source ON data_woningen(source);
CREATE INDEX IF NOT EXISTS idx_woningtekort_source ON data_woningtekort(source);
```

Values: `'cbs_actuals'`, `'cbs_prognose'`, and later `'ruimtemeesters_prognose'`.

### ON CONFLICT clause updates

All existing sync functions must update their ON CONFLICT clauses to include `source`:

```sql
-- Before:
ON CONFLICT (geo_code, year, age_group, gender) DO UPDATE SET value = EXCLUDED.value

-- After:
ON CONFLICT (geo_code, year, age_group, gender, source) DO UPDATE SET value = EXCLUDED.value
```

All sync functions explicitly set `source = 'cbs_actuals'` on insert. The new `syncPrognose()` sets `source = 'cbs_prognose'`.

### Geo area prerequisite

CBS table `84528NED` provides province and COROP data. The existing actuals sync skips these levels (`if (region.level !== 'gemeente' && region.level !== 'land') continue`).

`syncPrognose()` must:
1. Accept `'provincie'` and `'corop'` geo levels (not filter them out)
2. Upsert `geo_areas` rows for province and COROP regions during the sync (same pattern as existing gemeente upserts)

Province geo_areas already exist from migration `005_corop_regions.sql`. COROP regions also exist. So the foreign key constraint will be satisfied.

### Sync changes

New function `syncPrognose()` in `cbs-sync.ts`:
- Add `84528NED` to `CBS_TABLES` as `prognose`
- Fetch observations with no `Perioden` year filter (get all projected years)
- Accept `'provincie'` and `'corop'` geo levels
- Insert with `source = 'cbs_prognose'`

### DataPoint schema extension

Add `source` to the `DataPoint` type in `contracts.ts`:

```typescript
export const DataPoint = z.object({
  // ...existing fields
  source: z.string().optional(),  // 'cbs_actuals' | 'cbs_prognose' | etc.
});
```

### UI treatment

| Element | Actuals | Projections |
|---|---|---|
| Line chart | Solid line | Dashed line |
| Table cell | Normal | Light yellow background tint |
| Legend | "Bron: CBS, StatLine" | "Bron: CBS Regionale prognose" |
| Period bar | Normal buttons | Buttons with dotted border |

A vertical divider line in charts marks the transition from actuals to projections.

### Future TSA hook

When Ruimtemeesters builds its own forecasting model:
- Store with `source = 'ruimtemeesters_prognose'`
- Same tables, same UI treatment (different dash pattern or color)
- The `source` column makes this seamless

### Affected files

- New: `src/server/db/migrations/009_data_source_column.sql`
- Modified: `src/server/services/cbs/cbs-client.ts` — add `84528NED` to `CBS_TABLES`
- New: `syncPrognose()` in `src/server/services/cbs/cbs-sync.ts`
- Modified: all existing sync functions — update ON CONFLICT clauses, add source parameter
- Modified: `src/server/controllers/data.controller.ts` — include source in queries and response
- Modified: `src/shared/api/contracts.ts` — add `source` to `DataPoint`
- Modified: chart components — dashed line rendering for prognose data

### Tests

- New: migration test verifying constraint update
- Update: existing CBS sync tests to include source parameter
- New: `syncPrognose()` test
- Update: data controller test to verify source field in response

---

## Non-Goals

- ABF proprietary data (Woningmarktregio, BAR-huishoudens)
- Gemeente-level forecasts
- Own TSA model (architecture supports it, implementation is future)
- Sankey/benchmark pie charts
- Social media sharing
- Swing workspace XML

---

## Success Criteria

1. A user opens 3 tabs: Bevolking Amsterdam 2024, Huishoudens Rotterdam 2024, Woningtekort Nederland 2020-2024 — each with fully independent filters
2. Age groups exactly match Primos: 0-14, 15-29, 30-44, 45-64, 65-74, 75+
3. A bar chart of Amsterdam population shows a dashed reference line for Noord-Holland provincial average
4. Province-level population line chart shows solid lines to 2024 then dashed lines to 2050
5. All data clearly attributed: "Bron: CBS, StatLine" for actuals, "Bron: CBS Regionale prognose" for forecasts
6. Huishoudens can be viewed by composition type AND by age of reference person
7. Tab state survives page refresh via sessionStorage
8. All existing tests continue to pass after changes

---

## Implementation Order (Recommended)

1. **Age group realignment** — smallest change, unblocks correct data display
2. **Huishoudens per leeftijd** — extends CBS sync, adds dimension_type column (migration 010)
3. **CBS projections + source column** — database migration 009, extends data pipeline
4. **Vergelijkingsniveau** — extends FilterState and chart components
5. **Multiple presentation tabs** — largest change, refactors state management

This order minimizes risk: each step builds on the last, and the most invasive change (tabs) comes last when everything else is stable.

Note: migrations 009 and 010 should be numbered to run in order. Since feature 2 (migration 010) depends on feature 3's source column for the combined unique constraint, the implementation order for migrations is: 009 first (source column), then 010 (dimension_type + combined constraint).
