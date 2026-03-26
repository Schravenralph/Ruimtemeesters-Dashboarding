# Multi-Domain Supercategories — Design Spec

**Date:** 2026-03-26
**Status:** Approved
**Goal:** Expand the dashboarding platform from housing-only to multi-domain (wonen, duurzaamheid, economie, etc.) with supercategory navigation, a database-driven data source registry, and pluggable CBS sync.

---

## 1. Database — `data_sources` Registry

Replace the hardcoded `DATA_SOURCES` constant in controllers with a database table.

### Supercategories Table

```sql
CREATE TABLE supercategories (
  key VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(30),
  color VARCHAR(7),
  sort_order INT DEFAULT 0
);
```

### Data Sources Table

```sql
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  supercategory VARCHAR(50) NOT NULL REFERENCES supercategories(key),
  table_name VARCHAR(100) NOT NULL,
  dimension_columns TEXT[] NOT NULL,       -- for data queries: ['age_group', 'gender']
  value_column VARCHAR(50) DEFAULT 'value',
  unit VARCHAR(30) DEFAULT 'aantal',       -- 'aantal', 'percentage', 'kWh', 'ton CO2', 'kg'
  default_filters JSONB,                   -- source-specific default filters, e.g. {"dimension_type": "samenstelling"}
  export_columns TEXT[],                   -- columns for export controller; NULL = derive from dimension_columns
  cbs_table_id VARCHAR(20),
  sync_config JSONB,
  description TEXT,
  icon VARCHAR(30),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

The `default_filters` JSONB column replaces hardcoded `if (source === 'huishoudens')` logic. For huishoudens: `{"dimension_type": "samenstelling"}`. For other sources: `NULL` (no special filtering). The controller applies these automatically.

The `export_columns` field stores the full column list for the export controller. If NULL, the export controller derives it from `['geo_code', 'year'] + dimension_columns + [value_column, 'source']`.

### Themes Table Changes

```sql
ALTER TABLE themes ADD COLUMN supercategory VARCHAR(50) REFERENCES supercategories(key) DEFAULT 'wonen';
ALTER TABLE themes ADD COLUMN is_overview BOOLEAN DEFAULT false;
```

The `is_overview` flag replaces hardcoded `theme.slug === 'overzicht'` checks. Each supercategory can have one overview theme.

### Controller Change

Both `data.controller.ts` and `export.controller.ts` load `DATA_SOURCES` from the `data_sources` table on first request, cached in a module-level Map. Cache invalidated via a simple TTL (60s) — no complex pub/sub needed since admin changes are rare. Fallback to hardcoded constant if the DB query fails (safe rollback during migration).

The source-specific `if (source === 'huishoudens')` filter block in `data.controller.ts` (lines 81-89) is replaced by applying `default_filters` from the registry:

```typescript
// Before: if (source === 'huishoudens') { conditions.push(...) }
// After:
if (sourceDef.defaultFilters) {
  for (const [col, val] of Object.entries(sourceDef.defaultFilters)) {
    if (!req.query[col]) { // Only apply default if not overridden by query param
      conditions.push(`d.${col} = $${paramIdx++}`);
      params.push(val);
    }
  }
}
```

The `unit` conditional (`source === 'woningtekort' ? 'percentage' : 'aantal'`) is replaced by reading `sourceDef.unit` from the registry.

### Shared Contract Changes

Add to `src/shared/api/contracts.ts`:

```typescript
export const Supercategory = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  sortOrder: z.number(),
});

export type Supercategory = z.infer<typeof Supercategory>;
```

Add `supercategory: z.string().optional()` and `isOverview: z.boolean().optional()` to existing `ThemeConfig`.

---

## 2. Sustainability Data Tables

Four new tables. All use `NUMERIC(12,2)` for value columns (matching existing wonen tables after migration 011). Full DDL provided.

### data_energie

```sql
CREATE TABLE data_energie (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  sector VARCHAR(50) NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  value NUMERIC(12,2),
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, sector, fuel_type, source)
);
CREATE INDEX idx_energie_geo_year ON data_energie (geo_code, year);
CREATE INDEX idx_energie_source ON data_energie (source) WHERE source != 'cbs_actuals';
```

CBS source: **83867NED** — Energieverbruik woningen per gemeente (gemeente-level confirmed).

### data_emissies

```sql
CREATE TABLE data_emissies (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  sector VARCHAR(50) NOT NULL,
  emission_type VARCHAR(50) NOT NULL,
  value NUMERIC(12,2),
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, sector, emission_type, source)
);
CREATE INDEX idx_emissies_geo_year ON data_emissies (geo_code, year);
```

CBS source: **70072ned** measures M000179_1 etc. provide per-gemeente data. For detailed sector breakdown, **84978NED** (CO2 per sector per gemeente) or national 37221. **Note:** gemeente-level emissions may only have totals, not full sector breakdown. The sync config should handle this gracefully — missing dimensions get `'totaal'`.

### data_hernieuwbaar

```sql
CREATE TABLE data_hernieuwbaar (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  energy_source VARCHAR(50) NOT NULL,
  metric VARCHAR(50) NOT NULL,
  value NUMERIC(12,2),
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, energy_source, metric, source)
);
CREATE INDEX idx_hernieuwbaar_geo_year ON data_hernieuwbaar (geo_code, year);
```

CBS source: **84518NED** — Zonnestroom per gemeente (gemeente-level confirmed: capaciteit, productie).

### data_afval

```sql
CREATE TABLE data_afval (
  id SERIAL PRIMARY KEY,
  geo_code VARCHAR(10) NOT NULL,
  year INT NOT NULL,
  waste_type VARCHAR(50) NOT NULL,
  metric VARCHAR(50) NOT NULL,
  value NUMERIC(12,2),
  source VARCHAR(50) DEFAULT 'cbs_actuals',
  confidence_lower NUMERIC,
  confidence_upper NUMERIC,
  model_profile VARCHAR(50),
  forecast_vintage TIMESTAMP,
  UNIQUE(geo_code, year, waste_type, metric, source)
);
CREATE INDEX idx_afval_geo_year ON data_afval (geo_code, year);
```

CBS source: **83452NED** — Gemeentelijk afval (gemeente-level confirmed: kg per type, per inwoner).

---

## 3. Supercategory Navigation + Theme Wiring

### Backend

- New endpoint: `GET /api/supercategories` — returns list with nested theme slugs
- `GET /api/themes` gains optional `?supercategory=duurzaamheid` filter
- Data controller replaces hardcoded `DATA_SOURCES` with cached DB lookup

### Frontend

- `SupercategoryNav` component — horizontal tabs in header showing supercategories with icons and colors from the DB
- Clicking a supercategory filters theme list to that domain
- `ThemeContext` gains `activeSupercategory` state and `supercategories: Supercategory[]` list
- `DashboardPage` replaces `theme.slug === 'overzicht'` with `theme.isOverview === true`
- FilterBar fallback changes from hardcoded `'bevolking'` to `theme.tiles[0]?.dataSource` (already partially done)

### Hardcoded `'overzicht'` Removal — Full File List

All files with hardcoded `'overzicht'` references that must be updated to use `theme.isOverview`:

| File | Line | Change |
|------|------|--------|
| `src/client/pages/DashboardPage.tsx` | 168 | `theme.slug === 'overzicht'` → `theme.isOverview` |
| `src/client/App.tsx` | 46, 57 | Default route → first overview theme of first supercategory |
| `src/client/pages/LoginPage.tsx` | 30 | Post-login redirect → `/dashboard` (let App resolve default) |
| `src/client/contexts/AppConfigContext.tsx` | 19 | Default theme → from supercategory config |
| `src/client/contexts/PresentationContext.tsx` | 50 | Default presentation → active supercategory's overview |
| `src/client/hooks/useKeyboardShortcuts.ts` | 18 | Home shortcut → active supercategory's overview |
| `src/client/components/dashboard/SelectionWizard.tsx` | 98 | Default selection → context-driven |
| `src/client/pages/SettingsPage.tsx` | 16 | Default theme setting → from config |

### Seeded Sustainability Themes

| Supercategory | Theme | is_overview | Key Tiles |
|--------------|-------|-------------|-----------|
| Duurzaamheid | Overzicht Duurzaamheid | true | KPI cards for energie, emissies, zonnepanelen |
| Duurzaamheid | Energie | false | Energieverbruik per sector (bar), per brandstof (pie), trend (line) |
| Duurzaamheid | Emissies | false | CO2 per sector (stacked bar), trend (line), per inwoner (number) |
| Duurzaamheid | Hernieuwbare Energie | false | Zonnepanelen capaciteit (line), groei (bar) |
| Duurzaamheid | Afval & Circulair | false | Afval per type (pie), scheidingspercentage trend (line), per inwoner (bar) |

---

## 4. CBS Sync — Pluggable Pattern

### Generic Sync Config

```typescript
interface CbsSyncConfig {
  key: string;
  cbsTable: string;
  targetTable: string;
  filter: string;
  dimensionMappings: Array<{
    cbsDimension: string;
    targetColumn: string;
    valueMap: Record<string, string>;
  }>;
  measureCode: string;
  yearDimension?: string;   // defaults to 'Perioden'
  regionDimension?: string; // defaults to 'RegioS'
}
```

A single `syncGeneric(config: CbsSyncConfig)` function:
1. Validates the config (required fields, target table exists)
2. Fetches observations from CBS using the config's filter
3. Maps CBS dimension codes to column values via `valueMap`
4. Aggregates and upserts into the target table within a transaction (BEGIN/COMMIT/ROLLBACK)
5. Returns `SyncResult` (same shape as existing sync functions)

On config validation failure, logs error and returns `SyncResult` with error — does not crash the sync run.

Configs stored in `data_sources.sync_config` (JSONB column). Adding a new CBS source = one DB insert with the sync config, not a code change.

Existing wonen sync functions (`syncBevolking`, etc.) stay as-is for backward compatibility.

### CLI Dispatch

The CLI entrypoint (`src/server/db/sync-cbs.ts`) changes:
1. `--source bevolking` → routes to legacy `syncBevolking()` (existing function)
2. `--source energie` → loads sync_config from `data_sources` table → routes to `syncGeneric()`
3. `--supercategory duurzaamheid` → queries all `data_sources` where `supercategory = 'duurzaamheid'` and `sync_config IS NOT NULL`, runs `syncGeneric()` for each
4. No flag → runs all legacy syncs + all generic syncs

The dispatch checks if the source key matches a legacy function name first. If not, falls through to generic.

---

## 5. Migration Strategy

Three phases, each independently deployable.

### Phase 1 — Infrastructure (no breaking changes)

1. Migration 012: Create `supercategories`, `data_sources` tables. Add `supercategory` and `is_overview` columns to `themes`.
2. Seed wonen: insert supercategory "Wonen", insert `data_sources` rows for bevolking/huishoudens/woningen/woningtekort (with `default_filters` for huishoudens), update existing themes with `supercategory = 'wonen'` and `is_overview = true` for overzicht.
3. Refactor `data.controller.ts` and `export.controller.ts` to load DATA_SOURCES from DB with 60s TTL cache. Fallback to hardcoded if empty.
4. Replace source-specific conditionals with `default_filters` and `unit` from registry.

**Rollback:** Remove migration, controllers fall back to hardcoded constant.

### Phase 2 — Sustainability domain

5. Migration 013: Create `data_energie`, `data_emissies`, `data_hernieuwbaar`, `data_afval`.
6. Insert `data_sources` rows + "Duurzaamheid" supercategory + sync_config JSONB for each.
7. Implement `syncGeneric()` function + wire into CLI dispatch.
8. Run sync for sustainability tables.
9. Seed sustainability themes + tiles.

**Rollback:** New tables are additive. Remove themes/data_sources rows to hide from UI.

### Phase 3 — Frontend

10. Add `Supercategory` type to shared contracts, update `ThemeConfig`.
11. New `SupercategoryNav` component.
12. Wire `ThemeContext` with supercategory state.
13. Replace all hardcoded `'overzicht'` references (8 files, see table in Section 3).
14. Update FilterBar fallback.

**Rollback:** Revert frontend commit. Backend still works with old frontend since supercategory is optional.

### Migration Numbering

Current latest: 011. This spec uses 012 and 013. If another branch lands a migration before this, renumber accordingly.

---

## 6. Decisions & Trade-offs

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Per-domain tables vs generic data table | Per-domain | Query performance, typed dimensions, schema clarity. Registry makes it extensible. |
| Supercategory depth | 2 levels (supercategory → theme) | Simple, matches Primos pattern. Split supercategories when they grow. |
| Existing sync functions | Keep as-is | Battle-tested, no risk of regression. New domains use generic sync. |
| DATA_SOURCES location | Database with 60s TTL cache | Admin can add sources without code deploy. Fallback to hardcoded for safety. |
| Navigation style | Top-level tabs | Clear domain switching, doesn't clutter existing theme sidebar. |
| Source-specific query logic | `default_filters` JSONB | Generalizes huishoudens `dimension_type` pattern to any source. |
| Export controller | Derive from registry or use `export_columns` | Single source of truth, no duplicate constant. |
| `is_overview` flag | Boolean on themes | Replaces 8+ hardcoded slug checks with a data-driven flag. |
| ABAC policies | Existing `'theme:*'` wildcard covers all themes regardless of supercategory | No policy changes needed. |
