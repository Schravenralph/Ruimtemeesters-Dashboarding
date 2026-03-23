/**
 * CLI script to sync real CBS data into the database.
 *
 * Usage:
 *   pnpm run sync:cbs              # Sync all years
 *   pnpm run sync:cbs -- --year 2024  # Sync specific year
 *
 * Data source: CBS StatLine (opendata.cbs.nl)
 * License: CC-BY 4.0
 * Attribution: Bron: CBS, StatLine
 */

import { syncAllCbsData, syncBevolking, syncHuishoudens, syncHuishoudensLeeftijd, syncWoningen, syncWoningmutaties, calculateWoningtekort } from '../services/cbs/cbs-sync.js';
import { pool } from './pool.js';

async function main() {
  const args = process.argv.slice(2);
  const yearIdx = args.indexOf('--year');
  const yearFilter = yearIdx >= 0 ? parseInt(args[yearIdx + 1], 10) : undefined;
  const sourceIdx = args.indexOf('--source');
  const sourceFilter = sourceIdx >= 0 ? args[sourceIdx + 1] : undefined;

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   CBS Data Sync — Ruimtemeesters         ║');
  console.log('║   Bron: CBS, StatLine (opendata.cbs.nl)  ║');
  console.log('║   Licentie: CC-BY 4.0                    ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  if (yearFilter) {
    console.log(`Filtering for year: ${yearFilter}`);
  }

  try {
    if (sourceFilter) {
      console.log(`Syncing source: ${sourceFilter}`);
      let result;
      switch (sourceFilter) {
        case 'bevolking':
          result = await syncBevolking(yearFilter);
          break;
        case 'huishoudens':
          result = await syncHuishoudens(yearFilter);
          break;
        case 'woningen':
          result = await syncWoningen(yearFilter);
          break;
        case 'huishoudens-leeftijd':
          result = await syncHuishoudensLeeftijd(yearFilter);
          break;
        case 'woningmutaties':
          result = await syncWoningmutaties(yearFilter);
          break;
        case 'woningtekort':
          result = await calculateWoningtekort(yearFilter || 2024);
          break;
        default:
          console.error(`Unknown source: ${sourceFilter}`);
          process.exit(1);
      }
      console.log(`\nResult:`, JSON.stringify(result, null, 2));
    } else {
      const results = await syncAllCbsData(yearFilter);
      console.log('\n═══ Sync Results ═══');
      for (const r of results) {
        const status = r.errors.length === 0 ? '✓' : '✗';
        console.log(`${status} ${r.source}: ${r.rowsInserted} rows inserted from CBS table ${r.cbsTable} (${r.duration}ms)`);
        if (r.errors.length > 0) {
          for (const err of r.errors) {
            console.log(`  Error: ${err}`);
          }
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
