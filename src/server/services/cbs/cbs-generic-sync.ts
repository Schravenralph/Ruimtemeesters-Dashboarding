/**
 * Generic CBS sync — driven by JSONB config from data_sources table.
 *
 * Replaces the need for per-domain sync functions for new data sources.
 * Existing wonen syncs (syncBevolking etc.) are kept as-is.
 */

import { getClient } from '../../db/pool.js';
import { safeIdent } from '../../db/sql-utils.js';
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
    if (!config.cbsTable || !config.targetTable || !config.measureCode) {
      return {
        source: key, cbsTable: config.cbsTable || '?', rowsFetched: 0, rowsInserted: 0,
        errors: ['Invalid sync config: missing cbsTable, targetTable, or measureCode'],
        duration: 0, attribution: CBS_ATTRIBUTION,
      };
    }

    let filter = config.filter || `Measure eq '${config.measureCode}'`;
    if (yearFilter) {
      filter += ` and Perioden eq '${yearFilter}JJ00'`;
    }

    console.log(`[GenericSync] ${key}: fetching from CBS ${config.cbsTable}...`);
    const observations = await getObservations(config.cbsTable, filter);
    rowsFetched = observations.length;
    console.log(`[GenericSync] ${key}: ${rowsFetched} observations fetched`);

    const aggregated = new Map<string, Record<string, unknown>>();

    for (const obs of observations) {
      if (obs.Value === null) continue;

      const year = parseCbsPeriod(obs.Perioden as string);
      const region = parseCbsRegion(obs.RegioS as string);
      if (!year || !region) continue;
      if (region.level !== 'gemeente' && region.level !== 'land') continue;

      const dims: Record<string, string> = {};
      let skip = false;
      for (const mapping of config.dimensionMappings) {
        const cbsVal = obs[mapping.cbsDimension] as string;
        if (!cbsVal) { skip = true; break; }
        const trimmed = cbsVal.trim();
        const hasExplicitMap = Object.keys(mapping.valueMap).length > 0;
        const mapped = hasExplicitMap ? mapping.valueMap[trimmed] : trimmed;
        if (!mapped) { skip = true; break; }
        dims[mapping.targetColumn] = mapped;
      }
      if (skip) continue;

      const keyParts = [region.code, year, ...Object.values(dims)];
      const aggKey = keyParts.join('|');

      const existing = aggregated.get(aggKey);
      if (existing) {
        (existing.value as number) += obs.Value;
      } else {
        aggregated.set(aggKey, { geo_code: region.code, year, ...dims, value: obs.Value });
      }
    }

    if (aggregated.size === 0) {
      console.log(`[GenericSync] ${key}: no rows to insert after mapping`);
      return {
        source: key, cbsTable: config.cbsTable, rowsFetched, rowsInserted: 0,
        errors: [], duration: Date.now() - startTime, attribution: CBS_ATTRIBUTION,
      };
    }

    const sampleRow = aggregated.values().next().value as Record<string, unknown>;
    const columns = Object.keys(sampleRow);
    const safeTargetTable = safeIdent(config.targetTable);
    const safeColumns = columns.map(safeIdent);
    const safeConflictCols = columns.filter(c => c !== 'value').map(safeIdent).join(', ');

    const client = await getClient();
    try {
      await client.query('BEGIN');

      for (const row of aggregated.values()) {
        const vals = columns.map(c => row[c]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        await client.query(
          `INSERT INTO ${safeTargetTable} (${safeColumns.join(', ')}, source)
           VALUES (${placeholders}, 'cbs_actuals')
           ON CONFLICT (${safeConflictCols}, source) DO UPDATE SET value = EXCLUDED.value`,
          vals,
        );
        rowsInserted++;
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      errors.push(err instanceof Error ? err.message : 'Unknown DB error');
    } finally {
      client.release();
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : 'Failed to sync');
  }

  console.log(`[GenericSync] ${key}: ${rowsInserted} rows inserted (${Date.now() - startTime}ms)`);
  return {
    source: key, cbsTable: config.cbsTable, rowsFetched, rowsInserted,
    errors, duration: Date.now() - startTime, attribution: CBS_ATTRIBUTION,
  };
}
