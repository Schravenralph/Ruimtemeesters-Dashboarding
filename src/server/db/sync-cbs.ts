/**
 * CLI script to sync real CBS data into the database.
 *
 * Usage:
 *   pnpm run sync:cbs                             # Sync all (legacy + generic)
 *   pnpm run sync:cbs -- --year 2024              # Sync specific year
 *   pnpm run sync:cbs -- --source bevolking       # Legacy source
 *   pnpm run sync:cbs -- --source energie         # Generic source (from data_sources registry)
 *   pnpm run sync:cbs -- --supercategory duurzaamheid  # All sources in a supercategory
 *
 * Data source: CBS StatLine (opendata.cbs.nl)
 * License: CC-BY 4.0
 * Attribution: Bron: CBS, StatLine
 */

import { syncAllCbsData, syncBevolking, syncHuishoudens, syncHuishoudensLeeftijd, syncWoningen, syncWoningmutaties, calculateWoningtekort, syncPrognose } from '../services/cbs/cbs-sync.js';
import { syncGeneric, type GenericSyncConfig } from '../services/cbs/cbs-generic-sync.js';
import { pool, query } from './pool.js';

const LEGACY_SOURCES = new Set(['bevolking', 'huishoudens', 'woningen', 'huishoudens-leeftijd', 'woningmutaties', 'woningtekort', 'prognose']);

async function syncLegacySource(sourceFilter: string, yearFilter?: number) {
  switch (sourceFilter) {
    case 'bevolking': return syncBevolking(yearFilter);
    case 'huishoudens': return syncHuishoudens(yearFilter);
    case 'woningen': return syncWoningen(yearFilter);
    case 'huishoudens-leeftijd': return syncHuishoudensLeeftijd(yearFilter);
    case 'woningmutaties': return syncWoningmutaties(yearFilter);
    case 'woningtekort': return calculateWoningtekort(yearFilter || 2024);
    case 'prognose': return syncPrognose();
    default: return null;
  }
}

async function syncGenericSource(sourceKey: string, yearFilter?: number) {
  const dsResult = await query(
    'SELECT key, sync_config FROM data_sources WHERE key = $1 AND sync_config IS NOT NULL',
    [sourceKey],
  );
  if (dsResult.rows.length === 0) return null;
  const config = dsResult.rows[0].sync_config as GenericSyncConfig;
  return syncGeneric(sourceKey, config, yearFilter);
}

async function syncSupercategory(supercategory: string, yearFilter?: number) {
  const dsResult = await query(
    'SELECT key, sync_config FROM data_sources WHERE supercategory = $1 AND sync_config IS NOT NULL',
    [supercategory],
  );
  const results = [];
  for (const row of dsResult.rows) {
    console.log(`\nSyncing ${row.key}...`);
    const config = row.sync_config as GenericSyncConfig;
    const r = await syncGeneric(row.key, config, yearFilter);
    results.push(r);
    const status = r.errors.length === 0 ? '✓' : '✗';
    console.log(`${status} ${r.source}: ${r.rowsInserted} rows (${r.duration}ms)`);
    if (r.errors.length > 0) {
      for (const err of r.errors) console.log(`  Error: ${err}`);
    }
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const yearIdx = args.indexOf('--year');
  const yearFilter = yearIdx >= 0 ? parseInt(args[yearIdx + 1], 10) : undefined;
  const sourceIdx = args.indexOf('--source');
  const sourceFilter = sourceIdx >= 0 ? args[sourceIdx + 1] : undefined;
  const supercategoryIdx = args.indexOf('--supercategory');
  const supercategoryFilter = supercategoryIdx >= 0 ? args[supercategoryIdx + 1] : undefined;

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   CBS Data Sync — Ruimtemeesters         ║');
  console.log('║   Bron: CBS, StatLine (opendata.cbs.nl)  ║');
  console.log('║   Licentie: CC-BY 4.0                    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  if (yearFilter) console.log(`Filtering for year: ${yearFilter}`);

  try {
    if (supercategoryFilter) {
      // Sync all generic sources in a supercategory
      console.log(`Syncing supercategory: ${supercategoryFilter}`);
      await syncSupercategory(supercategoryFilter, yearFilter);

    } else if (sourceFilter) {
      console.log(`Syncing source: ${sourceFilter}`);

      // Try legacy first, then generic
      if (LEGACY_SOURCES.has(sourceFilter)) {
        const result = await syncLegacySource(sourceFilter, yearFilter);
        console.log(`\nResult:`, JSON.stringify(result, null, 2));
      } else {
        const result = await syncGenericSource(sourceFilter, yearFilter);
        if (result) {
          console.log(`\nResult:`, JSON.stringify(result, null, 2));
        } else {
          console.error(`Unknown source: ${sourceFilter} (not in legacy sources or data_sources registry)`);
          process.exit(1);
        }
      }

    } else {
      // Sync all: legacy + generic
      const legacyResults = await syncAllCbsData(yearFilter);
      console.log('\n═══ Legacy Sync Results ═══');
      for (const r of legacyResults) {
        const status = r.errors.length === 0 ? '✓' : '✗';
        console.log(`${status} ${r.source}: ${r.rowsInserted} rows from ${r.cbsTable} (${r.duration}ms)`);
      }

      // Generic sources
      const dsResult = await query('SELECT key, sync_config FROM data_sources WHERE sync_config IS NOT NULL');
      if (dsResult.rows.length > 0) {
        console.log('\n═══ Generic Sync Results ═══');
        for (const row of dsResult.rows) {
          const config = row.sync_config as GenericSyncConfig;
          const r = await syncGeneric(row.key, config, yearFilter);
          const status = r.errors.length === 0 ? '✓' : '✗';
          console.log(`${status} ${r.source}: ${r.rowsInserted} rows from ${r.cbsTable} (${r.duration}ms)`);
        }
      }
    }
  } catch (err) {
    console.error('Sync failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
