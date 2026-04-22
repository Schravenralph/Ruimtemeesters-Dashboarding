/**
 * Generic CBS sync — driven by JSONB config from data_sources table.
 *
 * Replaces the need for per-domain sync functions for new data sources.
 * Existing wonen syncs (syncBevolking etc.) are kept as-is.
 */

import { getClient, query } from '../../db/pool.js';
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
  /** CBS field holding the region code. Defaults to 'RegioS'. Some tables use
   *  'Postcode', 'Gemeente', etc. */
  regionDimension?: string;
  /** Geo levels to accept. Defaults to ['gemeente', 'land']. */
  allowedLevels?: string[];
}

export interface SyncResult {
  source: string;
  cbsTable: string;
  rowsFetched: number;
  rowsInserted: number;
  errors: string[];
  duration: number;
  attribution: string;
  syncRunId?: string;
}

/**
 * Global pull narrowing applied at sync time. All three fields are optional;
 * set only the constraints you want to enforce. These are GLOBAL — they
 * scope the one canonical pull, not anything per-org.
 */
export interface SubsetFilters {
  /** Inclusive year range. Both bounds optional (set one to cap only on
   *  that side). Pushed down to CBS as an OData `$filter` on Perioden. */
  yearRange?: { min?: number; max?: number };
  /** Whitelist of parsed geo levels to accept. Uses the same vocabulary as
   *  parseCbsRegion / metadata.geoLevels:
   *  'land' | 'landsdeel' | 'provincie' | 'corop' | 'gemeente' | 'wijk' |
   *  'buurt' | 'postcode4' | 'postcode6'. Matching happens after
   *  parseCbsRegion normalises the raw CBS code, so e.g. bare '1011'
   *  (→ postcode4) and 'PV20' (→ provincie) are correctly classified
   *  without brittle raw-prefix string matching. */
  regionLevels?: string[];
  /** Whitelist of allowed values per CBS dimension identifier (e.g.
   *  `{ "Geslacht": ["T001038"] }`). Rows with dim values outside the
   *  whitelist are dropped. Post-filtered server-side. */
  dimensionValues?: Record<string, string[]>;
}

export interface SyncOptions {
  yearFilter?: number;
  subsetFilters?: SubsetFilters;
  trigger?: 'manual' | 'scheduled' | 'activation';
  triggeredBy?: string | null;
}

export type SyncRunStatus = 'success' | 'partial' | 'failed';

/** Single source of truth for classifying a sync run's status. Used by both
 *  syncGeneric (sync_runs.status) and runScheduled (sync_schedules.last_run_status). */
export function classifySyncStatus(rowsInserted: number, errorCount: number): SyncRunStatus {
  if (rowsInserted > 0 && errorCount === 0) return 'success';
  if (rowsInserted > 0) return 'partial';
  return 'failed';
}

async function recordRunStart(key: string, cbsTable: string, opts: SyncOptions): Promise<string | null> {
  try {
    const r = await query(
      `INSERT INTO sync_runs (data_source_key, cbs_table_id, trigger, triggered_by)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [key, cbsTable, opts.trigger ?? 'manual', opts.triggeredBy ?? null],
    );
    return r.rows[0].id as string;
  } catch (err) {
    console.warn(`[GenericSync] failed to record sync_run start: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function recordRunFinish(
  id: string | null,
  status: 'success' | 'partial' | 'failed',
  result: { rowsFetched: number; rowsInserted: number; errors: string[]; duration: number },
) {
  if (!id) return;
  try {
    await query(
      `UPDATE sync_runs
         SET finished_at = NOW(), status = $2, rows_fetched = $3, rows_inserted = $4,
             duration_ms = $5, error_message = $6
       WHERE id = $1`,
      [
        id,
        status,
        result.rowsFetched,
        result.rowsInserted,
        result.duration,
        result.errors.length ? result.errors.slice(0, 5).join(' | ').slice(0, 2000) : null,
      ],
    );
  } catch (err) {
    console.warn(`[GenericSync] failed to record sync_run finish: ${err instanceof Error ? err.message : err}`);
  }
}

export async function syncGeneric(
  key: string,
  config: GenericSyncConfig,
  yearFilterOrOptions?: number | SyncOptions,
): Promise<SyncResult> {
  const options: SyncOptions = typeof yearFilterOrOptions === 'number'
    ? { yearFilter: yearFilterOrOptions }
    : (yearFilterOrOptions ?? {});
  const { yearFilter } = options;

  const startTime = Date.now();
  const errors: string[] = [];
  let rowsFetched = 0;
  let rowsInserted = 0;

  if (!config.cbsTable || !config.targetTable || !config.measureCode) {
    const msg = 'Invalid sync config: missing cbsTable, targetTable, or measureCode';
    console.error(`[GenericSync] ${key}: ${msg}`);
    return {
      source: key, cbsTable: config.cbsTable || '?', rowsFetched: 0, rowsInserted: 0,
      errors: [msg], duration: 0, attribution: CBS_ATTRIBUTION,
    };
  }

  const runId = await recordRunStart(key, config.cbsTable, options);

  const regionDim = config.regionDimension ?? 'RegioS';
  // 'NONE' means the CBS table has no region column at all — treat every
  // observation as national total (geo_code='NL', level='land'). Useful for
  // tables like 85668NED (emissions) that only publish NL-level numbers.
  const noRegion = regionDim === 'NONE';
  const allowedLevels = new Set(config.allowedLevels ?? ['gemeente', 'land']);

  try {
    let filter = config.filter || `Measure eq '${config.measureCode}'`;
    // yearRange from subset_filters takes precedence over legacy yearFilter.
    // We push year constraints down to CBS to minimise bytes on the wire.
    //
    // CBS period identifiers are strings like '2024JJ00' (yearly),
    // '2024MM03' (monthly), '2024KW1' (quarterly). The OData comparison
    // is lexicographic, and in ASCII 'K' and 'M' > 'J', so
    //   Perioden le '2024JJ00'
    // silently excludes 2024's monthly and quarterly rows.
    //
    // Use a half-open upper bound on the next year's JJ00 sentinel instead:
    //   Perioden lt '2025JJ00'
    // '2024MM12' lt '2025JJ00' compares digit-by-digit and correctly passes;
    // '2025JJ00' lt '2025JJ00' correctly fails. No asymmetry.
    const yr = options.subsetFilters?.yearRange;
    const minSentinel = yr?.min != null ? `${yr.min}JJ00` : null;
    const maxExclusive = yr?.max != null ? `${yr.max + 1}JJ00` : null;
    if (minSentinel && maxExclusive) {
      filter += ` and Perioden ge '${minSentinel}' and Perioden lt '${maxExclusive}'`;
    } else if (minSentinel) {
      filter += ` and Perioden ge '${minSentinel}'`;
    } else if (maxExclusive) {
      filter += ` and Perioden lt '${maxExclusive}'`;
    } else if (yearFilter) {
      filter += ` and Perioden eq '${yearFilter}JJ00'`;
    }

    console.log(`[GenericSync] ${key}: fetching from CBS ${config.cbsTable} (region dim: ${regionDim})...`);
    const observations = await getObservations(config.cbsTable, filter);
    rowsFetched = observations.length;
    console.log(`[GenericSync] ${key}: ${rowsFetched} observations fetched`);

    let regionMissCount = 0;
    let dimMissCount = 0;
    let levelSkipCount = 0;
    let subsetSkipCount = 0;
    const aggregated = new Map<string, Record<string, unknown>>();

    const regionLevelWhitelist = options.subsetFilters?.regionLevels?.length
      ? new Set(options.subsetFilters.regionLevels)
      : null;
    // Build per-dim value sets once so the hot loop is O(1) per row.
    const dimWhitelist: Map<string, Set<string>> | null = (() => {
      const entries = Object.entries(options.subsetFilters?.dimensionValues ?? {});
      if (!entries.length) return null;
      const m = new Map<string, Set<string>>();
      for (const [dim, values] of entries) {
        if (Array.isArray(values) && values.length > 0) m.set(dim, new Set(values));
      }
      return m.size > 0 ? m : null;
    })();

    for (const obs of observations) {
      if (obs.Value === null || obs.Value === undefined) continue;

      const year = parseCbsPeriod(obs.Perioden as string);
      const region = noRegion
        ? { code: 'NL', level: 'land' }
        : parseCbsRegion(obs[regionDim] as string | undefined);
      if (!year) continue;
      if (!region) { regionMissCount++; continue; }
      if (!noRegion && !allowedLevels.has(region.level)) { levelSkipCount++; continue; }

      // Region-level subset filter. Compares against the PARSED level
      // (gemeente, postcode4, ...) not the raw prefix, so bare postcode
      // codes ('1011') and provincie codes normalised to 'NL-XX' are
      // classified correctly.
      if (regionLevelWhitelist && !noRegion) {
        if (!regionLevelWhitelist.has(region.level)) {
          subsetSkipCount++; continue;
        }
      }

      // Dimension-value whitelist subset filter. Compared against the
      // pre-mapping CBS identifier (e.g. 'T001038'), not the mapped
      // target-column value.
      if (dimWhitelist) {
        let accepted = true;
        for (const [dim, allowed] of dimWhitelist) {
          const v = obs[dim] as string | undefined;
          if (!v || !allowed.has(String(v).trim())) { accepted = false; break; }
        }
        if (!accepted) { subsetSkipCount++; continue; }
      }

      const dims: Record<string, string> = {};
      let skip = false;
      for (const mapping of config.dimensionMappings) {
        const cbsVal = obs[mapping.cbsDimension] as string | undefined;
        if (!cbsVal) { skip = true; break; }
        const trimmed = String(cbsVal).trim();
        const hasExplicitMap = Object.keys(mapping.valueMap).length > 0;
        const mapped = hasExplicitMap ? mapping.valueMap[trimmed] : trimmed;
        if (!mapped) { skip = true; break; }
        dims[mapping.targetColumn] = mapped;
      }
      if (skip) { dimMissCount++; continue; }

      const keyParts = [region.code, year, ...Object.values(dims)];
      const aggKey = keyParts.join('|');

      const existing = aggregated.get(aggKey);
      if (existing) {
        (existing.value as number) += obs.Value as number;
      } else {
        aggregated.set(aggKey, { geo_code: region.code, year, ...dims, value: obs.Value });
      }
    }

    if (regionMissCount || dimMissCount || levelSkipCount || subsetSkipCount) {
      console.log(
        `[GenericSync] ${key}: skipped ${regionMissCount} unparsed regions, ` +
        `${levelSkipCount} out-of-scope levels, ${dimMissCount} unmapped dimensions, ` +
        `${subsetSkipCount} subset-filtered`,
      );
    }

    if (aggregated.size === 0) {
      const msg = 'No rows to insert after mapping. Check regionDimension, measureCode, and dimension value maps.';
      console.warn(`[GenericSync] ${key}: ${msg}`);
      errors.push(msg);
      const duration = Date.now() - startTime;
      // Always 'failed' here because rowsInserted is 0 by definition. The cause
      // (CBS empty vs mapping mismatch) is captured in errors[] and logs.
      await recordRunFinish(runId, 'failed', { rowsFetched, rowsInserted: 0, errors, duration });
      return {
        source: key, cbsTable: config.cbsTable, rowsFetched, rowsInserted: 0,
        errors, duration, attribution: CBS_ATTRIBUTION, syncRunId: runId ?? undefined,
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

        try {
          await client.query('SAVEPOINT sp_row');
          await client.query(
            `INSERT INTO ${safeTargetTable} (${safeColumns.join(', ')}, source)
             VALUES (${placeholders}, 'cbs_actuals')
             ON CONFLICT (${safeConflictCols}, source) DO UPDATE SET value = EXCLUDED.value`,
            vals,
          );
          await client.query('RELEASE SAVEPOINT sp_row');
          rowsInserted++;
        } catch (rowErr) {
          await client.query('ROLLBACK TO SAVEPOINT sp_row');
          const msg = rowErr instanceof Error ? rowErr.message : 'unknown row error';
          if (errors.length < 5) errors.push(msg);
          if (errors.length === 1) {
            console.warn(`[GenericSync] ${key}: first row insert failed — ${msg}. Row sample: ${JSON.stringify(row).slice(0, 300)}`);
          }
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      try { await client.query('ROLLBACK'); } catch { /* ignore */ }
      // Rollback wipes every successful savepoint — reset the counter so
      // sync_runs doesn't record rows that never actually landed.
      rowsInserted = 0;
      const msg = err instanceof Error ? err.message : 'Unknown DB error';
      errors.push(msg);
      console.error(`[GenericSync] ${key}: transaction failed — ${msg}`);
    } finally {
      client.release();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to sync';
    errors.push(msg);
    console.error(`[GenericSync] ${key}: fatal — ${msg}`);
  }

  const duration = Date.now() - startTime;
  const status = classifySyncStatus(rowsInserted, errors.length);
  await recordRunFinish(runId, status, { rowsFetched, rowsInserted, errors, duration });

  console.log(`[GenericSync] ${key}: ${rowsInserted}/${rowsFetched} rows inserted in ${duration}ms (status=${status}, errors=${errors.length})`);
  return {
    source: key, cbsTable: config.cbsTable, rowsFetched, rowsInserted,
    errors, duration, attribution: CBS_ATTRIBUTION, syncRunId: runId ?? undefined,
  };
}
