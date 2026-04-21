/**
 * CLI: crawl CBS catalogue and inspect per-table metadata.
 *
 * Usage:
 *   pnpm tsx scripts/inspect-cbs-catalogue.ts                # all rows, concurrency=8
 *   pnpm tsx scripts/inspect-cbs-catalogue.ts --concurrency=12
 *   pnpm tsx scripts/inspect-cbs-catalogue.ts --limit=20     # dry run first N
 *   pnpm tsx scripts/inspect-cbs-catalogue.ts --only-stale   # re-inspect CBS-modified rows
 *   pnpm tsx scripts/inspect-cbs-catalogue.ts --ids=85640NED,03759ned
 */
import { inspectAll } from '../src/server/services/cbs/cbs-catalog-metadata.js';
import { pool } from '../src/server/db/pool.js';

function arg(flag: string): string | undefined {
  const hit = process.argv.find(a => a.startsWith(`${flag}=`));
  return hit ? hit.slice(flag.length + 1) : undefined;
}
function flag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const concurrency = parseInt(arg('--concurrency') ?? '8', 10);
  const limit = arg('--limit') ? parseInt(arg('--limit')!, 10) : undefined;
  const onlyStale = flag('--only-stale');
  const identifiers = arg('--ids')?.split(',').map(s => s.trim()).filter(Boolean);

  console.log(
    `[Inspect] concurrency=${concurrency}`,
    limit ? `limit=${limit}` : '',
    onlyStale ? 'only-stale' : '',
    identifiers?.length ? `ids=${identifiers.length}` : '',
  );

  const t0 = Date.now();
  let lastLogged = 0;

  const summary = await inspectAll({
    concurrency,
    limit,
    onlyStale,
    identifiers,
    onProgress: (done, total, current) => {
      const now = Date.now();
      if (done === total || now - lastLogged > 1500) {
        const rate = done / ((now - t0) / 1000);
        const etaSec = rate > 0 ? Math.round((total - done) / rate) : 0;
        const etaH = Math.floor(etaSec / 3600);
        const etaM = Math.floor((etaSec % 3600) / 60);
        const etaS = etaSec % 60;
        const eta = etaH ? `${etaH}h${etaM}m` : etaM ? `${etaM}m${etaS}s` : `${etaS}s`;
        process.stdout.write(
          `\r[Inspect] ${done}/${total} (${(done / total * 100).toFixed(1)}%) · ${rate.toFixed(1)}/s · ETA ${eta} · last=${current}    `,
        );
        lastLogged = now;
      }
    },
  });
  process.stdout.write('\n');

  console.log(`[Inspect] done in ${(summary.durationMs / 1000).toFixed(1)}s: ok=${summary.ok} error=${summary.error}`);
  if (summary.errors.length) {
    console.log(`[Inspect] first ${Math.min(10, summary.errors.length)} errors:`);
    for (const e of summary.errors.slice(0, 10)) {
      console.log(`  ${e.identifier}: ${e.error}`);
    }
  }

  await pool.end();
  process.exit(summary.error > 0 && summary.ok === 0 ? 1 : 0);
}

main().catch(err => {
  console.error('[Inspect] fatal:', err);
  process.exit(2);
});
