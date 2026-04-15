/**
 * Data Source Registry — loads DATA_SOURCES from the database with fallback.
 *
 * Replaces the hardcoded DATA_SOURCES constant in controllers.
 * Cached in memory with 60s TTL. Falls back to hardcoded if DB unavailable.
 */

import { query } from '../db/pool.js';
import { safeIdent } from '../db/sql-utils.js';

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

// Hardcoded fallback — existing behavior preserved if DB is unavailable
const FALLBACK_SOURCES: Record<string, DataSourceDef> = {
  bevolking: { key: 'bevolking', name: 'Bevolking', supercategory: 'wonen', tableName: 'data_bevolking', dimensionColumns: ['age_group', 'gender'], valueColumn: 'value', unit: 'aantal', defaultFilters: null, exportColumns: null, cbsTableId: '03759ned', syncConfig: null },
  huishoudens: { key: 'huishoudens', name: 'Huishoudens', supercategory: 'wonen', tableName: 'data_huishoudens', dimensionColumns: ['household_type'], valueColumn: 'value', unit: 'aantal', defaultFilters: { dimension_type: 'samenstelling' }, exportColumns: null, cbsTableId: '71486ned', syncConfig: null },
  woningen: { key: 'woningen', name: 'Woningen', supercategory: 'wonen', tableName: 'data_woningen', dimensionColumns: ['tenure_type', 'dwelling_type'], valueColumn: 'value', unit: 'aantal', defaultFilters: null, exportColumns: null, cbsTableId: '82550NED', syncConfig: null },
  woningtekort: { key: 'woningtekort', name: 'Woningtekort', supercategory: 'wonen', tableName: 'data_woningtekort', dimensionColumns: ['metric'], valueColumn: 'value', unit: 'percentage', defaultFilters: { metric: 'tekort' }, exportColumns: null, cbsTableId: null, syncConfig: null },
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
      // Validate identifiers that will be used in SQL to prevent injection via DB config
      safeIdent(row.table_name);
      safeIdent(row.value_column || 'value');
      for (const col of row.dimension_columns) safeIdent(col);
      if (row.export_columns) {
        for (const col of row.export_columns) safeIdent(col);
      }

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
    // DB not available — use fallback
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
