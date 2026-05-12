/**
 * ADR-006 — sync demand decay runner.
 *
 * The aggregator filters `expires_at > NOW()`. When demands naturally expire
 * (default TTL 14 days), the schedule doesn't relax back unless someone calls
 * `aggregate()` again. This daily job is the trigger: re-aggregate per source
 * with outstanding demand rows, and reap long-expired rows for storage hygiene.
 */

import cron, { type ScheduledTask } from 'node-cron';
import { query } from '../../db/pool.js';
import { aggregate } from './aggregator.service.js';

let job: ScheduledTask | null = null;

export interface DecayRunResult {
  keysProcessed: number;
  rowsReaped: number;
  changedCount: number;
}

/**
 * Pure orchestrator (testable). Re-aggregates every data_source with at least
 * one demand row, then deletes rows expired > 30 days. Returns counts.
 *
 * `aggregateFn` injectable for unit testing without DB.
 */
export async function runDecay(
  aggregateFn: (k: string) => Promise<{ changed: boolean }> = aggregate,
): Promise<DecayRunResult> {
  const keysRes = await query<{ data_source_key: string }>(
    `SELECT DISTINCT data_source_key FROM sync_demand_requests`,
  );

  let changedCount = 0;
  for (const r of keysRes.rows) {
    const out = await aggregateFn(r.data_source_key);
    if (out.changed) changedCount += 1;
  }

  const reapRes = await query<{ count: string }>(
    `WITH d AS (
       DELETE FROM sync_demand_requests
       WHERE expires_at < NOW() - INTERVAL '30 days'
       RETURNING 1
     )
     SELECT COUNT(*)::text AS count FROM d`,
  );
  const rowsReaped = Number(reapRes.rows[0]?.count ?? 0);

  return { keysProcessed: keysRes.rowCount ?? 0, rowsReaped, changedCount };
}

export function startSyncDecayRunner(): void {
  if (job) return;
  const expression = process.env.SYNC_DEMAND_DECAY_CRON || '0 3 * * *';
  job = cron.schedule(
    expression,
    async () => {
      try {
        const result = await runDecay();
        console.log(
          `[SyncDecay] ${result.keysProcessed} sources processed, ` +
            `${result.changedCount} schedules changed, ` +
            `${result.rowsReaped} rows reaped`,
        );
      } catch (err) {
        console.error('[SyncDecay] run failed:', err);
      }
    },
    { timezone: process.env.TZ || 'Europe/Amsterdam' },
  );
  console.log(`[SyncDecay] registered cron='${expression}'`);
}

export function stopSyncDecayRunner(): void {
  if (job) {
    job.stop();
    job = null;
    console.log('[SyncDecay] stopped');
  }
}

export const _internals = { _getJob: () => job };
