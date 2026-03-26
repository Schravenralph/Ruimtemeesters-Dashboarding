# Multi-Domain Supercategories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the platform from housing-only to multi-domain with supercategory navigation, database-driven data source registry, and sustainability CBS data.

**Architecture:** Three phases — (1) infrastructure: DB registry + controller refactor, (2) sustainability domain: 4 new tables + generic CBS sync, (3) frontend: supercategory nav + hardcoded slug removal. Each phase independently deployable.

**Tech Stack:** TypeScript, Express 5, PostgreSQL, React 19, Zod, Tailwind CSS, CBS OData API

**Spec:** `docs/superpowers/specs/2026-03-26-multi-domain-supercategories-design.md`

---

## File Structure

```
src/server/db/migrations/
  012_supercategories_and_data_sources.sql    ← NEW
  013_sustainability_tables.sql               ← NEW
src/server/services/
  data-source-registry.ts                     ← NEW: cached DB lookup for DATA_SOURCES
  cbs/cbs-generic-sync.ts                     ← NEW: syncGeneric() driven by JSONB config
  cbs/cbs-sync.ts                             ← MODIFY: add generic dispatch to CLI
src/server/controllers/
  data.controller.ts                          ← MODIFY: use registry instead of hardcoded
  export.controller.ts                        ← MODIFY: use registry instead of hardcoded
  supercategory.controller.ts                 ← NEW
  theme.controller.ts                         ← MODIFY: add supercategory filter
src/server/routes/
  supercategory.routes.ts                     ← NEW
  theme.routes.ts                             ← MODIFY: add supercategory query param
src/server/db/
  seed.ts                                     ← MODIFY: seed supercategories + data_sources + sustainability themes
  sync-cbs.ts                                 ← MODIFY: add --supercategory flag + generic dispatch
src/shared/api/
  contracts.ts                                ← MODIFY: add Supercategory type, update ThemeConfig
src/client/
  components/ui/SupercategoryNav.tsx           ← NEW
  components/ui/Layout.tsx                     ← MODIFY: add SupercategoryNav
  contexts/ThemeContext.tsx                    ← MODIFY: add supercategory state
  services/api/supercategories.ts             ← NEW
  pages/DashboardPage.tsx                     ← MODIFY: isOverview instead of slug check
  pages/LoginPage.tsx                         ← MODIFY: generic redirect
  App.tsx                                     ← MODIFY: generic default route
  contexts/AppConfigContext.tsx                ← MODIFY: remove hardcoded overzicht
  contexts/PresentationContext.tsx             ← MODIFY: remove hardcoded overzicht
  hooks/useKeyboardShortcuts.ts               ← MODIFY: use context for home
  components/dashboard/SelectionWizard.tsx     ← MODIFY: use context
  pages/SettingsPage.tsx                       ← MODIFY: remove hardcoded default
```

---

## PHASE 1 — Infrastructure

### Task 1: Migration 012 — Supercategories & Data Sources Tables

**Files:**
- Create: `src/server/db/migrations/012_supercategories_and_data_sources.sql`

- [ ] **Step 1: Write migration**

```sql
-- Migration 012: Supercategories and data sources registry
-- Enables multi-domain dashboarding (wonen, duurzaamheid, etc.)

-- Supercategories: top-level domain grouping
CREATE TABLE supercategories (
  key VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(30),
  color VARCHAR(7),
  sort_order INT DEFAULT 0
);

-- Data sources registry: replaces hardcoded DATA_SOURCES constant
CREATE TABLE data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  supercategory VARCHAR(50) NOT NULL REFERENCES supercategories(key),
  table_name VARCHAR(100) NOT NULL,
  dimension_columns TEXT[] NOT NULL,
  value_column VARCHAR(50) DEFAULT 'value',
  unit VARCHAR(30) DEFAULT 'aantal',
  default_filters JSONB,
  export_columns TEXT[],
  cbs_table_id VARCHAR(20),
  sync_config JSONB,
  description TEXT,
  icon VARCHAR(30),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add supercategory and is_overview to themes
ALTER TABLE themes ADD COLUMN IF NOT EXISTS supercategory VARCHAR(50) REFERENCES supercategories(key);
ALTER TABLE themes ADD COLUMN IF NOT EXISTS is_overview BOOLEAN DEFAULT false;

-- Seed "Wonen" supercategory
INSERT INTO supercategories (key, name, description, icon, color, sort_order) VALUES
  ('wonen', 'Wonen', 'Bevolking, huishoudens en woningmarkt', 'Home', '#3b82f6', 0);

-- Seed existing data sources
INSERT INTO data_sources (key, name, supercategory, table_name, dimension_columns, value_column, unit, default_filters, cbs_table_id, sort_order) VALUES
  ('bevolking', 'Bevolking', 'wonen', 'data_bevolking', ARRAY['age_group', 'gender'], 'value', 'aantal', NULL, '03759ned', 0),
  ('huishoudens', 'Huishoudens', 'wonen', 'data_huishoudens', ARRAY['household_type'], 'value', 'aantal', '{"dimension_type": "samenstelling"}', '71486ned', 1),
  ('woningen', 'Woningen', 'wonen', 'data_woningen', ARRAY['tenure_type', 'dwelling_type'], 'value', 'aantal', NULL, '82550NED', 2),
  ('woningtekort', 'Woningtekort', 'wonen', 'data_woningtekort', ARRAY['metric'], 'value', 'percentage', NULL, NULL, 3);

-- Update existing themes with supercategory
UPDATE themes SET supercategory = 'wonen' WHERE supercategory IS NULL;
UPDATE themes SET is_overview = true WHERE slug = 'overzicht';
```

- [ ] **Step 2: Run migration**

```bash
pnpm run migrate
```

Expected: Migration 012 applied successfully.

- [ ] **Step 3: Verify**

```bash
psql -h localhost -p 6433 -U postgres -d dashboarding -c "SELECT key, name FROM data_sources ORDER BY sort_order"
```

Expected: 4 rows (bevolking, huishoudens, woningen, woningtekort)

- [ ] **Step 4: Commit**

```bash
git add src/server/db/migrations/012_supercategories_and_data_sources.sql
git commit -m "feat: migration 012 — supercategories and data sources registry"
```

---

### Task 2: Data Source Registry Service

**Files:**
- Create: `src/server/services/data-source-registry.ts`
- Test: `src/server/services/data-source-registry.test.ts`

- [ ] **Step 1: Write the registry service**

```typescript
// src/server/services/data-source-registry.ts
import { query } from '../db/pool.js';

export interface DataSourceDef {
  key: string;
  name: string;
  supercategory: string;
  tableName: string;
  dimensionColumns: string[];
  valueColumn: string;
  unit: string;
  defaultFilters: Record<string, string> | null;
  exportColumns: string[] | null;
  cbsTableId: string | null;
  syncConfig: unknown | null;
}

// Hardcoded fallback (existing behavior)
const FALLBACK_SOURCES: Record<string, DataSourceDef> = {
  bevolking: { key: 'bevolking', name: 'Bevolking', supercategory: 'wonen', tableName: 'data_bevolking', dimensionColumns: ['age_group', 'gender'], valueColumn: 'value', unit: 'aantal', defaultFilters: null, exportColumns: null, cbsTableId: '03759ned', syncConfig: null },
  huishoudens: { key: 'huishoudens', name: 'Huishoudens', supercategory: 'wonen', tableName: 'data_huishoudens', dimensionColumns: ['household_type'], valueColumn: 'value', unit: 'aantal', defaultFilters: { dimension_type: 'samenstelling' }, exportColumns: null, cbsTableId: '71486ned', syncConfig: null },
  woningen: { key: 'woningen', name: 'Woningen', supercategory: 'wonen', tableName: 'data_woningen', dimensionColumns: ['tenure_type', 'dwelling_type'], valueColumn: 'value', unit: 'aantal', defaultFilters: null, exportColumns: null, cbsTableId: '82550NED', syncConfig: null },
  woningtekort: { key: 'woningtekort', name: 'Woningtekort', supercategory: 'wonen', tableName: 'data_woningtekort', dimensionColumns: ['metric'], valueColumn: 'value', unit: 'percentage', defaultFilters: null, exportColumns: null, cbsTableId: null, syncConfig: null },
};

let cache: Record<string, DataSourceDef> | null = null;
let cacheTime = 0;
const TTL_MS = 60_000;

export async function getDataSources(): Promise<Record<string, DataSourceDef>> {
  if (cache && Date.now() - cacheTime < TTL_MS) return cache;

  try {
    const result = await query('SELECT * FROM data_sources ORDER BY sort_order');
    const sources: Record<string, DataSourceDef> = {};
    for (const row of result.rows) {
      sources[row.key] = {
        key: row.key,
        name: row.name,
        supercategory: row.supercategory,
        tableName: row.table_name,
        dimensionColumns: row.dimension_columns,
        valueColumn: row.value_column || 'value',
        unit: row.unit || 'aantal',
        defaultFilters: row.default_filters,
        exportColumns: row.export_columns,
        cbsTableId: row.cbs_table_id,
        syncConfig: row.sync_config,
      };
    }
    if (Object.keys(sources).length > 0) {
      cache = sources;
      cacheTime = Date.now();
      return sources;
    }
  } catch {
    // DB not available, use fallback
  }

  return FALLBACK_SOURCES;
}

export async function getDataSource(key: string): Promise<DataSourceDef | null> {
  const sources = await getDataSources();
  return sources[key] || null;
}

export function invalidateCache(): void {
  cache = null;
  cacheTime = 0;
}
```

- [ ] **Step 2: Write test**

```typescript
// src/server/services/data-source-registry.test.ts
import { describe, it, expect } from 'vitest';

describe('data-source-registry fallback', () => {
  it('returns fallback sources when DB unavailable', async () => {
    // Import with DB not connected — should return fallback
    const { getDataSources } = await import('./data-source-registry.js');
    const sources = await getDataSources();
    expect(sources.bevolking).toBeDefined();
    expect(sources.bevolking.tableName).toBe('data_bevolking');
    expect(sources.huishoudens.defaultFilters).toEqual({ dimension_type: 'samenstelling' });
    expect(sources.woningtekort.unit).toBe('percentage');
  });
});
```

- [ ] **Step 3: Run test**

```bash
pnpm run test:run -- --reporter verbose src/server/services/data-source-registry.test.ts
```

Expected: 1 PASS

- [ ] **Step 4: Commit**

```bash
git add src/server/services/data-source-registry.ts src/server/services/data-source-registry.test.ts
git commit -m "feat: data source registry service with DB lookup and fallback"
```

---

### Task 3: Refactor data.controller.ts to Use Registry

**Files:**
- Modify: `src/server/controllers/data.controller.ts`

- [ ] **Step 1: Replace hardcoded DATA_SOURCES with registry**

Remove the `const DATA_SOURCES = { ... }` block (lines 5-30). Replace all `DATA_SOURCES[source]` lookups with `await getDataSource(source)`. Replace the `if (source === 'huishoudens')` block with generic `defaultFilters` logic. Replace the hardcoded `unit` conditional with `sourceDef.unit`.

Key changes in `queryData()`:

```typescript
import { getDataSource } from '../services/data-source-registry.js';

export async function queryData(req: Request, res: Response): Promise<void> {
  // ... parsing unchanged ...

  const sourceDef = await getDataSource(source);
  if (!sourceDef) {
    res.status(400).json({ error: `Unknown data source: ${source}` });
    return;
  }

  // ... conditions building unchanged until line 74 ...

  // Replace huishoudens-specific block with generic default_filters
  if (sourceDef.defaultFilters) {
    for (const [col, val] of Object.entries(sourceDef.defaultFilters)) {
      const queryVal = req.query[col] as string;
      conditions.push(`d.${col} = $${paramIdx++}`);
      params.push(queryVal || val);
    }
  }

  // ... query building unchanged ...

  // Replace hardcoded unit with registry
  res.json({
    data,
    metadata: {
      source,
      totalRecords: parseInt(countResult.rows[0].total, 10),
      unit: sourceDef.unit,
    },
  });
}
```

Apply same pattern to `queryTimeSeries()`.

- [ ] **Step 2: Run existing tests**

```bash
pnpm run test:run
```

Expected: All 573 tests pass (no behavior change, just source of truth moved)

- [ ] **Step 3: Commit**

```bash
git add src/server/controllers/data.controller.ts
git commit -m "refactor: data controller uses DB registry instead of hardcoded DATA_SOURCES"
```

---

### Task 4: Refactor export.controller.ts to Use Registry

**Files:**
- Modify: `src/server/controllers/export.controller.ts`

- [ ] **Step 1: Replace hardcoded DATA_SOURCES**

Remove the `const DATA_SOURCES = { ... }` block. Use registry, deriving export columns:

```typescript
import { getDataSource } from '../services/data-source-registry.js';

// In exportData():
const sourceDef = await getDataSource(source);
if (!sourceDef) { ... }

const columns = sourceDef.exportColumns
  || ['geo_code', 'year', ...sourceDef.dimensionColumns, sourceDef.valueColumn, 'source'];
```

- [ ] **Step 2: Run tests**

```bash
pnpm run test:run
```

Expected: All pass

- [ ] **Step 3: Commit**

```bash
git add src/server/controllers/export.controller.ts
git commit -m "refactor: export controller uses DB registry"
```

---

### Task 5: Supercategory API Endpoint

**Files:**
- Create: `src/server/controllers/supercategory.controller.ts`
- Create: `src/server/routes/supercategory.routes.ts`
- Modify: `src/server/routes/theme.routes.ts`
- Modify: `src/server/controllers/theme.controller.ts`

- [ ] **Step 1: Create supercategory controller**

```typescript
// src/server/controllers/supercategory.controller.ts
import type { Request, Response } from 'express';
import { query } from '../db/pool.js';

export async function listSupercategories(req: Request, res: Response): Promise<void> {
  const result = await query(`
    SELECT s.key, s.name, s.description, s.icon, s.color, s.sort_order,
      COALESCE(json_agg(json_build_object('slug', t.slug, 'name', t.name, 'isOverview', t.is_overview) ORDER BY t."order") FILTER (WHERE t.id IS NOT NULL), '[]') as themes
    FROM supercategories s
    LEFT JOIN themes t ON t.supercategory = s.key AND t.is_system = true
    GROUP BY s.key, s.name, s.description, s.icon, s.color, s.sort_order
    ORDER BY s.sort_order
  `);

  res.json({
    supercategories: result.rows.map(r => ({
      key: r.key,
      name: r.name,
      description: r.description,
      icon: r.icon,
      color: r.color,
      sortOrder: r.sort_order,
      themes: r.themes,
    })),
  });
}
```

- [ ] **Step 2: Create route**

```typescript
// src/server/routes/supercategory.routes.ts
import { Router } from 'express';
import { listSupercategories } from '../controllers/supercategory.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();
router.get('/', optionalAuth, listSupercategories);
export default router;
```

- [ ] **Step 3: Register route in server**

Add to `src/server/index.ts` (where other routes are registered):

```typescript
import supercategoryRoutes from './routes/supercategory.routes.js';
app.use('/api/supercategories', supercategoryRoutes);
```

- [ ] **Step 4: Add supercategory filter to theme listing**

In `src/server/controllers/theme.controller.ts`, update `listThemes()` to accept `?supercategory=`:

```typescript
const supercategory = req.query.supercategory as string | undefined;
let sql = `SELECT * FROM themes WHERE is_system = true`;
const params: unknown[] = [];
if (supercategory) {
  sql += ` AND supercategory = $1`;
  params.push(supercategory);
}
sql += ` ORDER BY "order"`;
```

- [ ] **Step 5: Run tests + manual verify**

```bash
pnpm run test:run
curl http://localhost:5022/api/supercategories
```

Expected: Tests pass. API returns `{"supercategories": [{"key": "wonen", "name": "Wonen", ...}]}`

- [ ] **Step 6: Commit**

```bash
git add src/server/controllers/supercategory.controller.ts src/server/routes/supercategory.routes.ts src/server/controllers/theme.controller.ts src/server/routes/theme.routes.ts src/server/index.ts
git commit -m "feat: supercategory API endpoint + theme filtering by supercategory"
```

---

## PHASE 2 — Sustainability Domain

### Task 6: Migration 013 — Sustainability Tables

**Files:**
- Create: `src/server/db/migrations/013_sustainability_tables.sql`

- [ ] **Step 1: Write migration**

```sql
-- Migration 013: Sustainability data tables

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

-- Duurzaamheid supercategory
INSERT INTO supercategories (key, name, description, icon, color, sort_order) VALUES
  ('duurzaamheid', 'Duurzaamheid', 'Energie, emissies, hernieuwbaar en afval', 'Leaf', '#10b981', 1);

-- Data source registry entries
INSERT INTO data_sources (key, name, supercategory, table_name, dimension_columns, value_column, unit, cbs_table_id, sync_config, sort_order) VALUES
  ('energie', 'Energie', 'duurzaamheid', 'data_energie', ARRAY['sector', 'fuel_type'], 'value', 'TJ',
   '83867NED', '{"cbsTable":"83867NED","targetTable":"data_energie","filter":"","measureCode":"","dimensionMappings":[]}', 0),
  ('emissies', 'Emissies', 'duurzaamheid', 'data_emissies', ARRAY['sector', 'emission_type'], 'value', 'ton CO2-eq',
   NULL, NULL, 1),
  ('hernieuwbaar', 'Hernieuwbare Energie', 'duurzaamheid', 'data_hernieuwbaar', ARRAY['energy_source', 'metric'], 'value', 'kW',
   '84518NED', '{"cbsTable":"84518NED","targetTable":"data_hernieuwbaar","filter":"","measureCode":"","dimensionMappings":[]}', 2),
  ('afval', 'Afval & Circulair', 'duurzaamheid', 'data_afval', ARRAY['waste_type', 'metric'], 'value', 'kg',
   '83452NED', '{"cbsTable":"83452NED","targetTable":"data_afval","filter":"","measureCode":"","dimensionMappings":[]}', 3);

-- Sustainability themes
INSERT INTO themes (id, slug, name, description, icon, "order", is_system, supercategory, is_overview) VALUES
  ('30000000-0000-0000-0000-000000000001', 'duurzaamheid-overzicht', 'Overzicht Duurzaamheid', 'Totaaloverzicht duurzaamheidsindicatoren', 'Leaf', 0, true, 'duurzaamheid', true),
  ('30000000-0000-0000-0000-000000000002', 'energie', 'Energie', 'Energieverbruik per sector en brandstoftype', 'Zap', 1, true, 'duurzaamheid', false),
  ('30000000-0000-0000-0000-000000000003', 'emissies', 'Emissies', 'Broeikasgasemissies per sector', 'Cloud', 2, true, 'duurzaamheid', false),
  ('30000000-0000-0000-0000-000000000004', 'hernieuwbare-energie', 'Hernieuwbare Energie', 'Zonnepanelen, windenergie en biomassa', 'Sun', 3, true, 'duurzaamheid', false),
  ('30000000-0000-0000-0000-000000000005', 'afval-circulair', 'Afval & Circulair', 'Gemeentelijk afval en scheidingspercentages', 'Recycle', 4, true, 'duurzaamheid', false);

-- Tiles for sustainability themes (minimal set)
INSERT INTO theme_tiles (theme_id, title, chart_type, data_source, dimensions, "order") VALUES
  ('30000000-0000-0000-0000-000000000002', 'Energieverbruik per sector', 'bar', 'energie', ARRAY['sector'], 0),
  ('30000000-0000-0000-0000-000000000002', 'Energieverbruik per brandstof', 'pie', 'energie', ARRAY['fuel_type'], 1),
  ('30000000-0000-0000-0000-000000000002', 'Energieverbruik trend', 'line', 'energie', ARRAY['sector'], 2),
  ('30000000-0000-0000-0000-000000000004', 'Zonnestroom capaciteit', 'line', 'hernieuwbaar', ARRAY['energy_source'], 0),
  ('30000000-0000-0000-0000-000000000004', 'Hernieuwbare energie per bron', 'bar', 'hernieuwbaar', ARRAY['energy_source'], 1),
  ('30000000-0000-0000-0000-000000000005', 'Afval per type', 'pie', 'afval', ARRAY['waste_type'], 0),
  ('30000000-0000-0000-0000-000000000005', 'Scheidingspercentage trend', 'line', 'afval', ARRAY['waste_type'], 1);
```

- [ ] **Step 2: Run migration**

```bash
pnpm run migrate
```

- [ ] **Step 3: Verify**

```bash
curl http://localhost:5022/api/supercategories
```

Expected: Returns both "Wonen" and "Duurzaamheid" supercategories with their themes.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/migrations/013_sustainability_tables.sql
git commit -m "feat: migration 013 — sustainability tables, supercategory, themes, and tiles"
```

---

### Task 7: Generic CBS Sync

**Files:**
- Create: `src/server/services/cbs/cbs-generic-sync.ts`
- Modify: `src/server/db/sync-cbs.ts`

- [ ] **Step 1: Write generic sync function**

```typescript
// src/server/services/cbs/cbs-generic-sync.ts
import { getClient } from '../../db/pool.js';
import { getObservations, parseCbsPeriod, parseCbsRegion, CBS_ATTRIBUTION } from './cbs-client.js';

interface DimensionMapping {
  cbsDimension: string;
  targetColumn: string;
  valueMap: Record<string, string>;
}

export interface GenericSyncConfig {
  cbsTable: string;
  targetTable: string;
  filter: string;
  dimensionMappings: DimensionMapping[];
  measureCode: string;
  yearDimension?: string;
  regionDimension?: string;
}

interface SyncResult {
  source: string;
  cbsTable: string;
  rowsFetched: number;
  rowsInserted: number;
  errors: string[];
  duration: number;
  attribution: string;
}

export async function syncGeneric(key: string, config: GenericSyncConfig, yearFilter?: number): Promise<SyncResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let rowsFetched = 0;
  let rowsInserted = 0;

  try {
    // Validate config
    if (!config.cbsTable || !config.targetTable || !config.measureCode) {
      return { source: key, cbsTable: config.cbsTable || '?', rowsFetched: 0, rowsInserted: 0,
        errors: ['Invalid sync config: missing cbsTable, targetTable, or measureCode'], duration: 0, attribution: CBS_ATTRIBUTION };
    }

    // Build filter
    let filter = config.filter || `Measure eq '${config.measureCode}'`;
    if (yearFilter) {
      filter += ` and Perioden eq '${yearFilter}JJ00'`;
    }

    const observations = await getObservations(config.cbsTable, filter);
    rowsFetched = observations.length;

    // Aggregate observations
    const aggregated = new Map<string, Record<string, unknown>>();

    for (const obs of observations) {
      if (obs.Value === null) continue;

      const year = parseCbsPeriod(obs.Perioden as string);
      const region = parseCbsRegion(obs.RegioS as string);
      if (!year || !region) continue;
      if (region.level !== 'gemeente' && region.level !== 'land') continue;

      // Map dimensions
      const dims: Record<string, string> = {};
      let skip = false;
      for (const mapping of config.dimensionMappings) {
        const cbsVal = obs[mapping.cbsDimension] as string;
        const mapped = mapping.valueMap[cbsVal];
        if (!mapped) { skip = true; break; }
        dims[mapping.targetColumn] = mapped;
      }
      if (skip) continue;

      // Build aggregation key
      const keyParts = [region.code, year, ...Object.values(dims)];
      const aggKey = keyParts.join('|');

      const existing = aggregated.get(aggKey);
      if (existing) {
        (existing.value as number) += obs.Value;
      } else {
        aggregated.set(aggKey, {
          geo_code: region.code,
          year,
          ...dims,
          value: obs.Value,
        });
      }
    }

    // Build column list from first entry
    if (aggregated.size === 0) {
      return { source: key, cbsTable: config.cbsTable, rowsFetched, rowsInserted: 0,
        errors: [], duration: Date.now() - startTime, attribution: CBS_ATTRIBUTION };
    }

    const sampleRow = aggregated.values().next().value as Record<string, unknown>;
    const columns = Object.keys(sampleRow);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const conflictCols = columns.filter(c => c !== 'value').join(', ');

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const row of aggregated.values()) {
        const vals = columns.map(c => row[c]);
        await client.query(
          `INSERT INTO ${config.targetTable} (${columns.join(', ')}, source)
           VALUES (${placeholders}, 'cbs_actuals')
           ON CONFLICT (${conflictCols}, source) DO UPDATE SET value = EXCLUDED.value`,
          vals,
        );
        rowsInserted++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      errors.push(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      client.release();
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Failed to sync');
  }

  return {
    source: key,
    cbsTable: config.cbsTable,
    rowsFetched,
    rowsInserted,
    errors,
    duration: Date.now() - startTime,
    attribution: CBS_ATTRIBUTION,
  };
}
```

- [ ] **Step 2: Wire into CLI dispatch**

In `src/server/db/sync-cbs.ts`, add after the existing `switch` block:

```typescript
import { syncGeneric, type GenericSyncConfig } from '../services/cbs/cbs-generic-sync.js';
import { query as dbQuery } from './pool.js';

// In the sourceFilter switch default case, replace process.exit(1) with:
default: {
  // Try generic sync from data_sources registry
  const dsResult = await dbQuery('SELECT key, sync_config FROM data_sources WHERE key = $1 AND sync_config IS NOT NULL', [sourceFilter]);
  if (dsResult.rows.length > 0) {
    const config = dsResult.rows[0].sync_config as GenericSyncConfig;
    result = await syncGeneric(sourceFilter, config, yearFilter);
  } else {
    console.error(`Unknown source: ${sourceFilter}`);
    process.exit(1);
  }
}
```

Add `--supercategory` flag support:

```typescript
const supercategoryIdx = args.indexOf('--supercategory');
const supercategoryFilter = supercategoryIdx >= 0 ? args[supercategoryIdx + 1] : undefined;

if (supercategoryFilter) {
  const dsResult = await dbQuery(
    'SELECT key, sync_config FROM data_sources WHERE supercategory = $1 AND sync_config IS NOT NULL',
    [supercategoryFilter]
  );
  for (const row of dsResult.rows) {
    const config = row.sync_config as GenericSyncConfig;
    console.log(`Syncing ${row.key}...`);
    const r = await syncGeneric(row.key, config, yearFilter);
    console.log(`  ${r.rowsInserted} rows (${r.duration}ms) ${r.errors.length > 0 ? 'ERRORS: ' + r.errors.join(', ') : ''}`);
  }
}
```

- [ ] **Step 3: Test**

```bash
pnpm run sync:cbs -- --source energie
```

Expected: Attempts to sync from CBS 83867NED (may need sync_config refinement for dimension mappings).

- [ ] **Step 4: Commit**

```bash
git add src/server/services/cbs/cbs-generic-sync.ts src/server/db/sync-cbs.ts
git commit -m "feat: generic CBS sync + CLI dispatch for --source and --supercategory"
```

---

## PHASE 3 — Frontend

### Task 8: Shared Contract Updates

**Files:**
- Modify: `src/shared/api/contracts.ts`

- [ ] **Step 1: Add Supercategory type and update ThemeConfig**

```typescript
// Add after existing exports:
export const Supercategory = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  sortOrder: z.number(),
  themes: z.array(z.object({
    slug: z.string(),
    name: z.string(),
    isOverview: z.boolean().optional(),
  })).optional(),
});
export type Supercategory = z.infer<typeof Supercategory>;

// Update ThemeConfig — add two fields:
export const ThemeConfig = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  icon: z.string().optional(),
  tiles: z.array(TileConfig),
  order: z.number().default(0),
  isSystem: z.boolean().default(true),
  supercategory: z.string().optional(),
  isOverview: z.boolean().optional(),
});
```

- [ ] **Step 2: Run tests**

```bash
pnpm run test:run
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/api/contracts.ts
git commit -m "feat: Supercategory type + supercategory/isOverview on ThemeConfig"
```

---

### Task 9: SupercategoryNav Component + ThemeContext

**Files:**
- Create: `src/client/services/api/supercategories.ts`
- Create: `src/client/components/ui/SupercategoryNav.tsx`
- Modify: `src/client/contexts/ThemeContext.tsx`
- Modify: `src/client/components/ui/Layout.tsx`

- [ ] **Step 1: API service**

```typescript
// src/client/services/api/supercategories.ts
import { api } from './client';
import type { Supercategory } from '@shared/api/contracts';

export async function listSupercategories(): Promise<{ supercategories: Supercategory[] }> {
  return api.get('/supercategories');
}
```

- [ ] **Step 2: Update ThemeContext**

Add `activeSupercategory`, `supercategories`, and `setActiveSupercategory` to the context. Load supercategories on mount. Filter themes by active supercategory.

```typescript
// In ThemeContext.tsx, add:
import { listSupercategories } from '../services/api/supercategories';
import type { Supercategory } from '@shared/api/contracts';

interface ThemeContextValue {
  themes: ThemeConfig[];
  activeTheme: ThemeConfig | null;
  setActiveTheme: (theme: ThemeConfig) => void;
  supercategories: Supercategory[];
  activeSupercategory: string | null;
  setActiveSupercategory: (key: string) => void;
  isLoading: boolean;
  error: string | null;
}

// In ThemeProvider, add state + fetch:
const [supercategories, setSupercategories] = useState<Supercategory[]>([]);
const [activeSupercategory, setActiveSupercategory] = useState<string | null>(null);

useEffect(() => {
  Promise.all([listThemes(), listSupercategories()])
    .then(([themesRes, scRes]) => {
      setThemes(themesRes.themes);
      setSupercategories(scRes.supercategories);
      if (scRes.supercategories.length > 0) {
        setActiveSupercategory(scRes.supercategories[0].key);
      }
      if (themesRes.themes.length > 0) {
        setActiveTheme(themesRes.themes[0]);
      }
    })
    .catch(err => setError(err.message))
    .finally(() => setIsLoading(false));
}, []);
```

- [ ] **Step 3: Create SupercategoryNav**

```typescript
// src/client/components/ui/SupercategoryNav.tsx
import { useThemes } from '../../contexts/ThemeContext';

export function SupercategoryNav() {
  const { supercategories, activeSupercategory, setActiveSupercategory } = useThemes();

  if (supercategories.length <= 1) return null; // Hide if only one domain

  return (
    <nav className="border-b border-gray-200 bg-white px-4">
      <div className="flex gap-1">
        {supercategories.map(sc => (
          <button
            key={sc.key}
            onClick={() => setActiveSupercategory(sc.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeSupercategory === sc.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            style={activeSupercategory === sc.key && sc.color ? { borderColor: sc.color, color: sc.color } : undefined}
          >
            {sc.name}
          </button>
        ))}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Add to Layout**

In `src/client/components/ui/Layout.tsx`, add `<SupercategoryNav />` between `<Header />` and `<PresentationTabBar />`:

```typescript
import { SupercategoryNav } from './SupercategoryNav';

// In the JSX:
<div className="hidden md:block">
  <Header />
</div>
<SupercategoryNav />
<PresentationTabBar />
```

- [ ] **Step 5: Run tests + build**

```bash
pnpm run test:run && pnpm run build:client
```

- [ ] **Step 6: Commit**

```bash
git add src/client/services/api/supercategories.ts src/client/components/ui/SupercategoryNav.tsx src/client/contexts/ThemeContext.tsx src/client/components/ui/Layout.tsx
git commit -m "feat: SupercategoryNav component + ThemeContext with supercategory state"
```

---

### Task 10: Remove Hardcoded 'overzicht' References

**Files:** 8 files listed in spec Section 3.

- [ ] **Step 1: DashboardPage.tsx**

Replace `theme.slug === 'overzicht'` with `theme.isOverview`:

```typescript
// Line 168: change condition
{theme.isOverview && (
  <>
    <StatsSummary />
    <OverviewGrid />
  </>
)}
```

- [ ] **Step 2: App.tsx**

Replace hardcoded `/dashboard/overzicht` with a dynamic resolver:

```typescript
// Line 46: use a DefaultRedirect component
function DefaultRedirect() {
  const { themes } = useThemes();
  const overview = themes.find(t => t.isOverview);
  return <Navigate to={`/dashboard/${overview?.slug || themes[0]?.slug || 'overzicht'}`} replace />;
}

// In routes:
<Route path="/" element={<Layout><DefaultRedirect /></Layout>} />
<Route path="*" element={<Layout><DefaultRedirect /></Layout>} />
```

- [ ] **Step 3: LoginPage.tsx**

Change post-login redirect from `/dashboard/overzicht` to `/dashboard`:

```typescript
navigate('/dashboard');
```

- [ ] **Step 4: Remaining 5 files**

For each of `AppConfigContext.tsx`, `PresentationContext.tsx`, `useKeyboardShortcuts.ts`, `SelectionWizard.tsx`, `SettingsPage.tsx`:

Replace any hardcoded `'overzicht'` with a context-driven lookup. Pattern:
```typescript
const { themes } = useThemes();
const defaultSlug = themes.find(t => t.isOverview)?.slug || themes[0]?.slug || '';
```

- [ ] **Step 5: FilterBar fallback**

In `FilterBar.tsx`, change:
```typescript
// From: dataSource={theme.tiles[0]?.dataSource || 'bevolking'}
// To: dataSource={theme.tiles[0]?.dataSource || ''}
```

- [ ] **Step 6: Run full test suite + build**

```bash
pnpm run test:run && pnpm run build:client
```

Expected: All tests pass, client builds.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove all hardcoded 'overzicht' references — use isOverview flag"
```

---

### Task 11: Final Verification

- [ ] **Step 1: Run all tests**

```bash
pnpm run test:run
```

Expected: 573+ tests pass

- [ ] **Step 2: Build**

```bash
pnpm run build
```

Expected: Client and server build without errors

- [ ] **Step 3: Verify supercategory API**

```bash
curl http://localhost:5022/api/supercategories | python3 -m json.tool
```

Expected: Returns Wonen and Duurzaamheid with nested themes

- [ ] **Step 4: Verify data query works for new sources**

```bash
curl "http://localhost:5022/api/data/query?source=energie&geoCode=GM0363&year=2024"
```

Expected: Returns data (empty array if not yet synced, but no error)

- [ ] **Step 5: Commit and push**

```bash
git add -A
git commit -m "feat: multi-domain supercategories — complete implementation"
git push origin main
```
