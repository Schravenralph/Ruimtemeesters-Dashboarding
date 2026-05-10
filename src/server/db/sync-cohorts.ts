/**
 * CLI entry: pnpm run sync:cohorts [--csv path/to/krimp.csv]
 *
 * Populates cohort_definitions + cohort_members for the per-municipality
 * referential drilldown view (ADR-003).
 *
 * SPEC: docs/superpowers/specs/2026-05-09-cohort-referential-data-design.md
 */

import { syncAllCohorts } from '../services/cohorts/cohort-sync.js';
import { pool } from './pool.js';

async function main() {
  const args = process.argv.slice(2);
  let csvPath: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--csv' && args[i + 1]) {
      csvPath = args[i + 1];
    }
  }

  console.log('Starting cohort sync...');
  if (csvPath) console.log(`Krimp/anticipeer CSV: ${csvPath}`);

  const results = await syncAllCohorts({ krimpCsvPath: csvPath });

  console.log('\n=== Cohort sync results ===');
  let hadErrors = false;
  for (const r of results) {
    const status = r.errors.length === 0 ? '✓' : '✗';
    console.log(`${status} ${r.cohortType}: ${r.definitionsUpserted} definitions, ${r.membersUpserted} members (${r.durationMs}ms)`);
    if (r.errors.length > 0) {
      hadErrors = true;
      for (const err of r.errors) console.log(`  Error: ${err}`);
    }
  }

  await pool.end();
  process.exit(hadErrors ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal:', err);
  pool.end().finally(() => process.exit(1));
});
