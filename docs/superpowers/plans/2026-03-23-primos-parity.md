# Primos Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 5 features that close the most impactful gaps between our dashboard and Primos Datawonen — age groups, household age breakdown, presentation tabs, geographic comparison, and CBS forecasts.

**Architecture:** Server-side changes update the CBS sync pipeline and database schema. Client-side changes add PresentationContext for multi-tab state, extend FilterState for comparison, and update chart components for prognose rendering. Each feature is independently deployable.

**Tech Stack:** React 19, TypeScript, Express 5, PostgreSQL, Zod, Recharts, Vitest

**Spec:** `docs/superpowers/specs/2026-03-23-primos-parity-design.md`

---

## File Map

### New files
| File | Purpose |
|------|---------|
| `src/server/db/migrations/009_data_source_column.sql` | Add `source` column + updated unique constraints |
| `src/server/db/migrations/010_huishoudens_dimension_type.sql` | Add `dimension_type` column to data_huishoudens |
| `src/client/contexts/PresentationContext.tsx` | Multi-tab state management |
| `src/client/contexts/PresentationContext.test.tsx` | Tests for presentation tabs |
| `src/client/components/ui/PresentationTabBar.tsx` | Tab bar UI component |
| `src/client/hooks/useComparisonQuery.ts` | Comparison data fetching hook |
| `src/client/components/ui/PresentationTabBar.test.tsx` | Tab bar tests |
| `src/server/services/cbs/cbs-sync.test.ts` | Age group boundary tests |

### Modified files
| File | What changes |
|------|-------------|
| `src/server/services/cbs/cbs-sync.ts` | `ageToGroup()` boundaries, ON CONFLICT clauses, new `syncPrognose()`, household age sync |
| `src/server/services/cbs/cbs-client.ts` | Add `84528NED` to CBS_TABLES |
| `src/server/controllers/data.controller.ts` | Include `source` in queries and response |
| `src/shared/api/contracts.ts` | FilterState comparison fields, DataPoint source field |
| `src/client/utils/format.ts` | `dimensionValueLabel()` new age group labels |
| `src/client/contexts/FilterContext.tsx` | Becomes pass-through to PresentationContext |
| `src/client/components/filters/FilterBar.tsx` | Add comparison UI section |
| `src/client/components/ui/Layout.tsx` | Add PresentationTabBar |
| `src/client/components/charts/LineChart.tsx` | Dashed line for prognose data |
| `src/client/components/charts/BarChart.tsx` | Reference line for comparison |
| `src/client/components/charts/DataTable.tsx` | Reference row for comparison, yellow tint for prognose |
| `src/client/components/dashboard/DashboardTile.tsx` | Wire comparison data into tile charts |
| `src/client/hooks/useDataQuery.ts` | Add geoCodeOverride parameter |
| `src/client/pages/DashboardPage.tsx` | Create/activate tab on slug change |
| `src/client/App.tsx` | Wrap with PresentationProvider |

---

## Task 1: Age Group Realignment

**Files:**
- Modify: `src/server/services/cbs/cbs-sync.ts:79-88`
- Modify: `src/client/utils/format.ts:70-89`
- Test: `src/server/services/cbs/cbs-sync.test.ts` (new)
- Test: `src/client/utils/format.test.ts` (update)

- [ ] **Step 1: Write test for new ageToGroup boundaries**

Create `src/server/services/cbs/cbs-sync.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';

// Extract ageToGroup for testing — we'll export it
// For now test the boundary logic directly
describe('ageToGroup', () => {
  function ageToGroup(age: number): string | null {
    if (age === -1) return 'totaal';
    if (age >= 0 && age <= 14) return '0-14';
    if (age >= 15 && age <= 29) return '15-29';
    if (age >= 30 && age <= 44) return '30-44';
    if (age >= 45 && age <= 64) return '45-64';
    if (age >= 65 && age <= 74) return '65-74';
    if (age >= 75) return '75+';
    return null;
  }

  it('maps age 0 to 0-14', () => expect(ageToGroup(0)).toBe('0-14'));
  it('maps age 14 to 0-14', () => expect(ageToGroup(14)).toBe('0-14'));
  it('maps age 15 to 15-29', () => expect(ageToGroup(15)).toBe('15-29'));
  it('maps age 29 to 15-29', () => expect(ageToGroup(29)).toBe('15-29'));
  it('maps age 30 to 30-44', () => expect(ageToGroup(30)).toBe('30-44'));
  it('maps age 44 to 30-44', () => expect(ageToGroup(44)).toBe('30-44'));
  it('maps age 45 to 45-64', () => expect(ageToGroup(45)).toBe('45-64'));
  it('maps age 64 to 45-64', () => expect(ageToGroup(64)).toBe('45-64'));
  it('maps age 65 to 65-74', () => expect(ageToGroup(65)).toBe('65-74'));
  it('maps age 74 to 65-74', () => expect(ageToGroup(74)).toBe('65-74'));
  it('maps age 75 to 75+', () => expect(ageToGroup(75)).toBe('75+'));
  it('maps age 105 to 75+', () => expect(ageToGroup(105)).toBe('75+'));
  it('maps -1 to totaal', () => expect(ageToGroup(-1)).toBe('totaal'));
});
```

- [ ] **Step 2: Run test to verify it passes** (these test the NEW boundaries inline)

Run: `npx vitest run src/server/services/cbs/cbs-sync.test.ts`
Expected: PASS (testing the target logic, not the old code)

- [ ] **Step 3: Update ageToGroup() in cbs-sync.ts**

Change `src/server/services/cbs/cbs-sync.ts` lines 79-88:
```typescript
function ageToGroup(age: number): string | null {
  if (age === -1) return 'totaal';
  if (age >= 0 && age <= 14) return '0-14';
  if (age >= 15 && age <= 29) return '15-29';
  if (age >= 30 && age <= 44) return '30-44';
  if (age >= 45 && age <= 64) return '45-64';
  if (age >= 65 && age <= 74) return '65-74';
  if (age >= 75) return '75+';
  return null;
}
```

- [ ] **Step 4: Export ageToGroup and update test to import it**

In `cbs-sync.ts`, export the function: `export function ageToGroup(...)`. Update the test file to import it instead of re-implementing:
```typescript
import { ageToGroup } from '../services/cbs/cbs-sync';
```
Remove the inline copy from the test.

- [ ] **Step 5: Update dimensionValueLabel() in format.ts**

In `src/client/utils/format.ts`, update the labels record (line ~72) — remove old age groups, keep everything else unchanged. No new keys needed since the age group strings are self-descriptive.

- [ ] **Step 6: Check and update i18n.ts**

Grep `src/client/utils/i18n.ts` for old age group strings (`15-24`, `25-44`, `65-79`, `80+`). Update any matches to the new Primos-aligned groups.

- [ ] **Step 7: Update format tests**

In `src/client/utils/format.test.ts`, update any tests that reference `'15-24'`, `'25-44'`, `'65-79'`, `'80+'` to use the new groups.

- [ ] **Step 8: Run all tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 7: Clean old data and re-sync**

```bash
PGPASSWORD=postgres psql -h localhost -p 6433 -U postgres -d dashboarding -c "DELETE FROM data_bevolking WHERE age_group IN ('15-24', '25-44', '65-79', '80+');"
pnpm run sync:cbs -- --source bevolking --year 2024
```
Verify: `SELECT DISTINCT age_group FROM data_bevolking ORDER BY age_group;` should show `0-14, 15-29, 30-44, 45-64, 65-74, 75+, totaal`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: realign age groups to Primos standard (0-14, 15-29, 30-44, 45-64, 65-74, 75+)"
```

---

## Task 2: Database Migration — Source Column (009)

**Files:**
- Create: `src/server/db/migrations/009_data_source_column.sql`

- [ ] **Step 1: Write migration 009**

Create `src/server/db/migrations/009_data_source_column.sql`:
```sql
-- Add source column to distinguish actuals from projections
ALTER TABLE data_bevolking ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';
ALTER TABLE data_huishoudens ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';
ALTER TABLE data_woningen ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';
ALTER TABLE data_woningtekort ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'cbs_actuals';

-- Drop old unique constraints and recreate with source
ALTER TABLE data_bevolking DROP CONSTRAINT IF EXISTS data_bevolking_geo_code_year_age_group_gender_key;
ALTER TABLE data_bevolking ADD CONSTRAINT data_bevolking_unique
  UNIQUE(geo_code, year, age_group, gender, source);

ALTER TABLE data_woningen DROP CONSTRAINT IF EXISTS data_woningen_geo_code_year_tenure_type_dwelling_type_key;
ALTER TABLE data_woningen ADD CONSTRAINT data_woningen_unique
  UNIQUE(geo_code, year, tenure_type, dwelling_type, source);

ALTER TABLE data_woningtekort DROP CONSTRAINT IF EXISTS data_woningtekort_geo_code_year_metric_key;
ALTER TABLE data_woningtekort ADD CONSTRAINT data_woningtekort_unique
  UNIQUE(geo_code, year, metric, source);

-- Indexes for source filtering
CREATE INDEX IF NOT EXISTS idx_bevolking_source ON data_bevolking(source);
CREATE INDEX IF NOT EXISTS idx_huishoudens_source ON data_huishoudens(source);
CREATE INDEX IF NOT EXISTS idx_woningen_source ON data_woningen(source);
CREATE INDEX IF NOT EXISTS idx_woningtekort_source ON data_woningtekort(source);
```

- [ ] **Step 2: Run migration**

```bash
pnpm run migrate
```
Expected: `✓ 009_data_source_column.sql applied`

- [ ] **Step 3: Update ON CONFLICT clauses in sync functions (EXCEPT huishoudens)**

In `src/server/services/cbs/cbs-sync.ts`, update `ON CONFLICT` clauses for tables whose constraints were updated in migration 009. **Do NOT update `syncHuishoudens()` yet** — its constraint is updated in migration 010 (Task 3).

Update these functions to add `, source` to conflict columns and `source = 'cbs_actuals'` to INSERT:
- `syncBevolking()` (~line 144)
- `syncWoningen()` (~line 335)
- `syncWoningmutaties()`
- `calculateWoningtekort()`

Leave `syncHuishoudens()` unchanged in this task — it is updated in Task 3.

- [ ] **Step 4: Run tests + verify sync still works**

```bash
npx vitest run
pnpm run sync:cbs -- --source bevolking --year 2024
```
Expected: All tests pass, sync completes without errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add source column to data tables (migration 009) for actuals vs prognose"
```

---

## Task 3: Database Migration — Huishoudens Dimension Type (010)

**Files:**
- Create: `src/server/db/migrations/010_huishoudens_dimension_type.sql`

- [ ] **Step 1: Write migration 010**

Create `src/server/db/migrations/010_huishoudens_dimension_type.sql`:
```sql
-- Add dimension_type to distinguish composition vs age-of-reference-person
ALTER TABLE data_huishoudens ADD COLUMN IF NOT EXISTS dimension_type VARCHAR(50) DEFAULT 'samenstelling';

-- Update unique constraint to include dimension_type and source
ALTER TABLE data_huishoudens DROP CONSTRAINT IF EXISTS data_huishoudens_geo_code_year_household_type_key;
ALTER TABLE data_huishoudens ADD CONSTRAINT data_huishoudens_unique
  UNIQUE(geo_code, year, household_type, dimension_type, source);
```

- [ ] **Step 2: Run migration**

```bash
pnpm run migrate
```
Expected: `✓ 010_huishoudens_dimension_type.sql applied`

- [ ] **Step 3: Update syncHuishoudens ON CONFLICT clause + add source**

In `cbs-sync.ts`, update the huishoudens INSERT to include both `dimension_type` and `source` columns, and update the ON CONFLICT clause to match the new constraint:
```sql
INSERT INTO data_huishoudens (geo_code, year, household_type, dimension_type, source, value)
VALUES ($1, $2, $3, 'samenstelling', 'cbs_actuals', $4)
ON CONFLICT (geo_code, year, household_type, dimension_type, source)
DO UPDATE SET value = EXCLUDED.value
```

- [ ] **Step 4: Run sync to verify**

```bash
pnpm run sync:cbs -- --source huishoudens --year 2024
```
Expected: completes without constraint errors

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add dimension_type column to data_huishoudens (migration 010)"
```

---

## Task 4: Huishoudens per Leeftijd Referentiepersoon

**Files:**
- Modify: `src/server/services/cbs/cbs-sync.ts`

- [ ] **Step 1: Fetch and document CBS LeeftijdReferentiepersoon codes**

```bash
curl -s "https://datasets.cbs.nl/odata/v1/CBS/71486ned/LeeftijdReferentiepersoonCodes" | python3 -m json.tool
```
Document the mapping as a constant in cbs-sync.ts.

- [ ] **Step 2: Add household age sync function**

Add `syncHuishoudensLeeftijd()` in `cbs-sync.ts` — a new function (not modifying existing `syncHuishoudens`):

```typescript
const HUISHOUDEN_LEEFTIJD_MAPPING: Record<string, string> = {
  // Map CBS LeeftijdReferentiepersoon codes → Primos age groups
  // To be filled from Step 1 results
  // e.g.: '53100': '0-29', '53200': '30-44', etc.
};

export async function syncHuishoudensLeeftijd(yearFilter?: number): Promise<SyncResult> {
  // For each age group:
  // 1. Query CBS with the specific LeeftijdReferentiepersoon code
  // 2. Get totaal huishoudens measure
  // 3. Insert with dimension_type = 'leeftijd_referentiepersoon'
}
```

- [ ] **Step 3: Add to syncAllCbsData()**

Call `syncHuishoudensLeeftijd()` after `syncHuishoudens()` in the full sync.

- [ ] **Step 4: Add to CLI**

In `src/server/db/sync-cbs.ts`, add `case 'huishoudens-leeftijd'` to the switch.

- [ ] **Step 5: Run sync and verify**

```bash
pnpm run sync:cbs -- --source huishoudens-leeftijd --year 2024
```
Verify:
```sql
SELECT DISTINCT household_type, dimension_type FROM data_huishoudens ORDER BY dimension_type, household_type;
```
Should show both `samenstelling` and `leeftijd_referentiepersoon` rows.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: sync huishoudens per leeftijd referentiepersoon from CBS"
```

---

## Task 5: Update Contracts — Source + Comparison Fields

**Files:**
- Modify: `src/shared/api/contracts.ts`

- [ ] **Step 1: Add source to DataPoint**

In `src/shared/api/contracts.ts`, update `DataPoint`:
```typescript
export const DataPoint = z.object({
  geoCode: z.string(),
  geoName: z.string(),
  year: z.number(),
  dimension: z.string().optional(),
  dimensionValue: z.string().optional(),
  value: z.number(),
  label: z.string().optional(),
  source: z.string().optional(),
});
```

- [ ] **Step 2: Add comparison fields to FilterState**

```typescript
export const FilterState = z.object({
  geoLevel: GeoLevel.default('land'),
  geoCode: z.string().default('NL'),
  period: PeriodSelection.default({ year: 2024, compareYear: null }),
  dimensions: z.record(z.string()).default({}),
  comparisonEnabled: z.boolean().default(false),
  comparisonLevel: GeoLevel.nullable().default(null),
  comparisonGeoCode: z.string().nullable().default(null),
});
```

- [ ] **Step 3: Update FilterContext defaultFilters to match**

In `src/client/contexts/FilterContext.tsx`, add to `defaultFilters` (line ~23):
```typescript
const defaultFilters: FilterState = {
  geoLevel: 'land',
  geoCode: 'NL',
  period: { year: 2024, compareYear: null },
  dimensions: {},
  comparisonEnabled: false,
  comparisonLevel: null,
  comparisonGeoCode: null,
};
```
This prevents TypeScript errors since FilterState now requires these fields.

- [ ] **Step 4: Update contract tests**

Update `src/shared/api/contracts.test.ts` and `src/shared/api/contracts.export.test.ts` — add tests for new fields with defaults.

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add source and comparison fields to contracts + FilterContext defaults"
```

---

## Task 6: Update Data Controller — Include Source

**Files:**
- Modify: `src/server/controllers/data.controller.ts`

- [ ] **Step 1: Update query to include source column**

In `data.controller.ts`, update the `queryData` SQL to select `d.source` and include it in the response mapping:

```typescript
const data = result.rows.map(row => ({
  geoCode: row.geo_code,
  geoName: row.geo_name,
  year: row.year,
  dimension: dimension || sourceDef.dimensionColumns[0],
  dimensionValue: row[sourceDef.dimensionColumns[0]],
  value: Number(row.value),
  source: row.source || 'cbs_actuals',
}));
```

- [ ] **Step 2: Add dataOrigin and dimensionType filters to DataQueryParams**

In `contracts.ts`, add to `DataQueryParams`:
```typescript
dataOrigin: z.string().optional(),    // 'cbs_actuals' | 'cbs_prognose' — filters by source column
dimensionType: z.string().optional(), // 'samenstelling' | 'leeftijd_referentiepersoon' — for huishoudens
```
Note: the existing `source` param selects the data table (bevolking/huishoudens/etc.). `dataOrigin` filters by the `source` column within that table.

- [ ] **Step 2b: Add dimension_type filtering to data controller**

In `data.controller.ts`, when `source === 'huishoudens'`, add:
```typescript
if (dimensionType) {
  conditions.push(`d.dimension_type = $${paramIdx++}`);
  params.push(dimensionType);
} else {
  // Default to 'samenstelling' for backward compatibility
  conditions.push(`d.dimension_type = $${paramIdx++}`);
  params.push('samenstelling');
}
```
Similarly, filter by `dataOrigin` when provided:
```typescript
if (dataOrigin) {
  conditions.push(`d.source = $${paramIdx++}`);
  params.push(dataOrigin);
}
```

- [ ] **Step 3: Run tests + verify API returns source**

```bash
npx vitest run
curl -s "http://localhost:5022/api/data/query?source=bevolking&geoCode=GM0363&year=2024" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['data'][0])"
```
Expected: response includes `"source": "cbs_actuals"`

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: include source field in data API responses"
```

---

## Task 7: CBS Prognose Sync

**Files:**
- Modify: `src/server/services/cbs/cbs-client.ts`
- Modify: `src/server/services/cbs/cbs-sync.ts`
- Modify: `src/server/db/sync-cbs.ts`

- [ ] **Step 1: Add prognose table to CBS_TABLES**

In `cbs-client.ts`:
```typescript
export const CBS_TABLES = {
  // ...existing
  prognose: '84528NED',
} as const;
```

- [ ] **Step 2: Fetch and document prognose table structure**

```bash
curl -s "https://datasets.cbs.nl/odata/v1/CBS/84528NED" | python3 -m json.tool
curl -s "https://datasets.cbs.nl/odata/v1/CBS/84528NED/MeasureCodes" | python3 -m json.tool
curl -s "https://datasets.cbs.nl/odata/v1/CBS/84528NED/RegioSCodes?$top=5" | python3 -m json.tool
```

- [ ] **Step 3: Write syncPrognose() function**

In `cbs-sync.ts`, add new function that:
- Fetches observations from `84528NED`
- Accepts `'provincie'` and `'corop'` geo levels (NOT filtering them out)
- Upserts `geo_areas` for province/COROP regions
- Inserts with `source = 'cbs_prognose'`
- Maps CBS measure codes to population/household counts

- [ ] **Step 4: Add to CLI and syncAllCbsData**

In `sync-cbs.ts`, add `case 'prognose'` to the switch.
In `syncAllCbsData()`, call `syncPrognose()` after other syncs.

- [ ] **Step 5: Run prognose sync**

```bash
pnpm run sync:cbs -- --source prognose
```
Verify:
```sql
SELECT source, COUNT(*), MIN(year), MAX(year) FROM data_bevolking GROUP BY source;
```
Expected: `cbs_actuals` rows with years ≤2024, `cbs_prognose` rows with years >2024

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: sync CBS regional projections (84528NED) with source=cbs_prognose"
```

---

## Task 8: Vergelijkingsniveau — FilterState + Hook

**Files:**
- Modify: `src/client/contexts/FilterContext.tsx`
- Create: `src/client/hooks/useComparisonQuery.ts`
- Modify: `src/client/components/filters/FilterBar.tsx`

- [ ] **Step 1: Add comparison setters to FilterContext**

In `FilterContext.tsx`, add to the interface and provider:
```typescript
setComparisonLevel: (level: GeoLevel | null) => void;
setComparisonGeoCode: (code: string | null) => void;
```
Add the corresponding `useCallback` setters and update `defaultFilters` with `comparisonLevel: null, comparisonGeoCode: null`.

- [ ] **Step 2: Add geoCodeOverride to useDataQuery**

In `src/client/hooks/useDataQuery.ts`, add `geoCodeOverride?: string` to `UseDataQueryOptions`. In the `fetchData` callback, use `geoCodeOverride ?? filters.geoCode` when calling `queryData()`.

- [ ] **Step 3: Write useComparisonQuery hook**

Create `src/client/hooks/useComparisonQuery.ts`:
```typescript
import { useDataQuery } from './useDataQuery';
import { useFilters } from '../contexts/FilterContext';

export function useComparisonQuery(source: string, dimension?: string) {
  const { filters } = useFilters();
  return useDataQuery({
    source,
    dimension,
    enabled: !!filters.comparisonLevel && !!filters.comparisonGeoCode,
    geoCodeOverride: filters.comparisonGeoCode || undefined,
  });
}
```

- [ ] **Step 3: Add comparison UI to FilterBar**

In `FilterBar.tsx`, add a "Vergelijken met" section after the existing filters:
- Toggle switch to enable comparison
- GeoLevel select (land/provincie/corop)
- Area select (conditional on level)
- Auto-select "NL" when level is "land"

- [ ] **Step 4: Update FilterContext tests**

Add tests for `setComparisonLevel` and `setComparisonGeoCode` in `FilterContext.test.tsx`.

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add vergelijkingsniveau filter state and comparison query hook"
```

---

## Task 9: Vergelijkingsniveau — Chart Rendering

**Files:**
- Modify: `src/client/components/charts/BarChart.tsx`
- Modify: `src/client/components/charts/LineChart.tsx`
- Modify: `src/client/components/charts/DataTable.tsx`

- [ ] **Step 1: Add reference line to BarChart**

In `BarChart.tsx`, accept an optional `comparisonValue` prop. When set, render a Recharts `<ReferenceLine>` with `strokeDasharray="5 5"` and a label.

- [ ] **Step 2: Add comparison line to LineChart**

In `LineChart.tsx`, accept optional `comparisonData` prop. When set, render a second `<Line>` with `strokeDasharray="8 4"` and different color.

- [ ] **Step 3: Add reference row to DataTable**

In `DataTable.tsx`, accept optional `comparisonRow` prop. When set, render it as the first row with `bg-blue-50` background and bold label.

- [ ] **Step 4: Wire comparison data into DashboardTile**

In `DashboardTile.tsx`, use `useComparisonQuery` alongside the main `useDataQuery`. Pass the comparison data to the chart components as props.

- [ ] **Step 5: Run tests + manual verify**

Run: `npx vitest run`
Manual: Navigate to `/dashboard/bevolking`, enable comparison with "Nederland", verify reference line appears on bar chart.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: render inline comparison (reference lines/rows) in charts and tables"
```

---

## Task 10: Prognose UI Treatment

**Files:**
- Modify: `src/client/components/charts/LineChart.tsx`
- Modify: `src/client/components/charts/DataTable.tsx`

- [ ] **Step 1: Detect prognose data in LineChart**

When rendering line data, check if `dataPoint.source === 'cbs_prognose'`. Split the line into two segments:
- `source === 'cbs_actuals'`: solid line
- `source === 'cbs_prognose'`: dashed line (`strokeDasharray="6 3"`)

Add a vertical `<ReferenceLine>` at the transition year.

- [ ] **Step 2: Add yellow tint to prognose cells in DataTable**

When rendering table cells, check if the data point has `source === 'cbs_prognose'`. If so, add `bg-yellow-50` to the cell.

- [ ] **Step 3: Update legend to show source attribution**

In the legend/footer area, show "Bron: CBS, StatLine" for actuals and "Bron: CBS Regionale prognose" for forecast data.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: visual distinction for prognose data (dashed lines, yellow tint)"
```

---

## Task 11: PresentationContext

**Files:**
- Create: `src/client/contexts/PresentationContext.tsx`
- Create: `src/client/contexts/PresentationContext.test.tsx`

- [ ] **Step 1: Write failing tests for PresentationContext**

Create `src/client/contexts/PresentationContext.test.tsx`:
```typescript
describe('PresentationContext', () => {
  it('starts with one default presentation');
  it('adds a new presentation');
  it('removes a presentation');
  it('cannot remove the last presentation');
  it('switches active presentation');
  it('enforces max 10 presentations');
  it('updates a presentation');
  it('persists to sessionStorage');
  it('restores from sessionStorage');
  it('falls back to default on corrupt sessionStorage');
});
```

- [ ] **Step 2: Run tests — verify they fail**

Run: `npx vitest run src/client/contexts/PresentationContext.test.tsx`
Expected: FAIL (file doesn't exist yet)

- [ ] **Step 3: Implement PresentationContext**

Create `src/client/contexts/PresentationContext.tsx` with:
- `Presentation` interface (id, title, themeSlug, filters, chartType, transformation)
- `PresentationProvider` component with sessionStorage persistence
- `usePresentations()` hook
- Max 10 enforcement, cannot remove last tab

- [ ] **Step 4: Run tests — verify they pass**

Run: `npx vitest run src/client/contexts/PresentationContext.test.tsx`
Expected: All PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PresentationContext with multi-tab state + sessionStorage persistence"
```

---

## Task 12: FilterContext Pass-Through

**Files:**
- Modify: `src/client/contexts/FilterContext.tsx`
- Update: `src/client/contexts/FilterContext.test.tsx`

- [ ] **Step 1: Refactor FilterContext to delegate to PresentationContext**

Replace the internal `useState` with reads/writes from `usePresentations()`:
```typescript
export function FilterProvider({ children }: { children: ReactNode }) {
  const { activePresentation, updatePresentation, activeId } = usePresentations();

  const filters = activePresentation?.filters ?? defaultFilters;

  const setGeoLevel = useCallback((level: GeoLevel) => {
    if (!activeId) return;
    updatePresentation(activeId, {
      filters: { ...filters, geoLevel: level },
    });
  }, [activeId, filters, updatePresentation]);

  // ... same pattern for all setters
}
```

- [ ] **Step 2: Update FilterContext tests**

Wrap test renders with both `PresentationProvider` and `FilterProvider`. Verify existing tests still pass — the API hasn't changed.

- [ ] **Step 3: Run ALL tests**

Run: `npx vitest run`
Expected: All pass (backward compat preserved)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor: FilterContext delegates to PresentationContext (backward compat preserved)"
```

---

## Task 13: PresentationTabBar + Layout Integration

**Files:**
- Create: `src/client/components/ui/PresentationTabBar.tsx`
- Modify: `src/client/components/ui/Layout.tsx`
- Modify: `src/client/pages/DashboardPage.tsx`
- Modify: `src/client/App.tsx`

- [ ] **Step 1: Create PresentationTabBar component**

```typescript
// Shows tab bar with: title | × per tab, + button, active highlight
export function PresentationTabBar() {
  const { presentations, activeId, setActive, removePresentation, addPresentation } = usePresentations();
  // Render tab buttons, close buttons, add button
}
```

- [ ] **Step 2: Add PresentationTabBar to Layout**

In `Layout.tsx`, add `<PresentationTabBar />` between `<Header />` and `<main>`.

- [ ] **Step 3: Wrap App with PresentationProvider**

In `App.tsx`, add `<PresentationProvider>` inside `<ThemeProvider>` but outside `<FilterProvider>`:
```
AuthProvider > ThemeProvider > PresentationProvider > FilterProvider > ToastProvider
```

- [ ] **Step 4: Update DashboardPage to create/activate tabs**

In `DashboardPage.tsx`, when slug changes:
- Check if a tab with that themeSlug exists → activate it
- If not → create new tab with that slug

- [ ] **Step 5: Write PresentationTabBar test**

Create `src/client/components/ui/PresentationTabBar.test.tsx`:
```typescript
describe('PresentationTabBar', () => {
  it('renders tab for each presentation');
  it('highlights active tab');
  it('calls setActive when clicking a tab');
  it('calls removePresentation when clicking close');
  it('does not show close button on last tab');
  it('calls addPresentation when clicking +');
});
```

- [ ] **Step 6: Run all tests + manual verify**

Run: `npx vitest run`
Manual: Open `/dashboard/bevolking`, then click sidebar to `/dashboard/huishoudens` — verify both tabs appear, switching works, filters are independent.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add presentation tab bar with multi-tab navigation"
```

---

## Task 14: Final Integration Test + Push

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
npx tsc --noEmit
npx vite build
```
Expected: All pass, clean type check, clean build

- [ ] **Step 2: Verify success criteria**

Manual testing checklist:
1. Open 3 tabs with independent filters ✓
2. Age groups match Primos ✓
3. Comparison reference line visible ✓
4. Prognose data shows dashed lines ✓
5. Source attribution correct ✓
6. Huishoudens by age available ✓
7. Tabs survive refresh ✓

- [ ] **Step 3: Push to GitHub**

```bash
git push origin main
```
