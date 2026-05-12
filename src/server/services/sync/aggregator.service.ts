/**
 * ADR-006 sync-demand aggregator.
 *
 * On insert/expire of a sync_demand_requests row, recompute the effective cron
 * for the data_source: most-strict of non-expired demands, bounded by
 * data_sources.max_frequency_cron. Mutates the single global sync_schedules row.
 *
 * Pure helpers (cronIntervalMinutes, compareCronStrictness) are exported via
 * _internals for unit testing without DB.
 */

import { query, getClient } from '../../db/pool.js';
import { notifySubscribers } from './subscriber-notifier.js';

/**
 * Estimate the typical between-fire interval, in minutes, for the common 5-field
 * cron patterns we use today. Higher number = less strict (fires less often).
 *
 * Heuristic — handles the patterns we actually use (every-N minutes/hours,
 * daily, weekly, monthly). Unknown patterns return Infinity so they sort as
 * "least strict" and never block a clearer demand.
 */
export function cronIntervalMinutes(cron: string): number {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return Infinity;
  const [min, hour, dom, _mon, dow] = parts;

  // Every-N minutes
  const minStep = /^\*\/(\d+)$/.exec(min);
  if (minStep && hour === '*' && dom === '*' && dow === '*') {
    return Number(minStep[1]);
  }
  // Every minute
  if (min === '*' && hour === '*' && dom === '*' && dow === '*') return 1;

  // Every-N hours, fixed minute
  const hourStep = /^\*\/(\d+)$/.exec(hour);
  if (/^\d+$/.test(min) && hourStep && dom === '*' && dow === '*') {
    return Number(hourStep[1]) * 60;
  }

  // Hourly: M * * * *
  if (/^\d+$/.test(min) && hour === '*' && dom === '*' && dow === '*') return 60;

  // Daily: M H * * *
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && dow === '*') return 1440;

  // Weekly: M H * * N
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && /^\d+$/.test(dow)) return 10080;

  // Monthly: M H D * *
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && /^\d+$/.test(dom) && dow === '*') return 43200;

  return Infinity;
}

/**
 * Negative if a is stricter than b (fires more often), positive if less strict,
 * zero if equally strict. "Strictest" = smallest interval.
 */
export function compareCronStrictness(a: string, b: string): number {
  return cronIntervalMinutes(a) - cronIntervalMinutes(b);
}

/**
 * Pick the strictest cron from a non-empty list. Stable: first wins on ties.
 */
export function strictestCron(crons: string[]): string | null {
  if (crons.length === 0) return null;
  return crons.reduce((acc, c) => (compareCronStrictness(c, acc) < 0 ? c : acc));
}

/**
 * Apply the per-source cap to a chosen cron. If cap is non-null and the chosen
 * cron is STRICTER than the cap, return the cap. Otherwise return the chosen
 * cron. Returns the cap-value as `cappedAt` when the cap actually clipped.
 */
export function applyCap(chosen: string, cap: string | null): { effective: string; cappedAt: string | null } {
  if (!cap) return { effective: chosen, cappedAt: null };
  if (compareCronStrictness(chosen, cap) < 0) return { effective: cap, cappedAt: cap };
  return { effective: chosen, cappedAt: null };
}

export interface AggregateResult {
  dataSourceKey: string;
  effectiveCron: string;
  changed: boolean;
  appliedDemandCount: number;
  cappedAt: string | null;
}

/**
 * Recompute the effective cron for a data source and update sync_schedules.
 *
 * Behaviour:
 *   - With non-expired demands: pick strictest, apply cap, write if differs.
 *   - With no demands: leave baseline cron untouched (admin owns the baseline).
 *   - Single row update under `FOR UPDATE` lock for concurrency safety.
 */
export async function aggregate(dataSourceKey: string): Promise<AggregateResult> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const scheduleRes = await client.query<{ id: string; cron_expression: string }>(
      `SELECT id, cron_expression FROM sync_schedules
       WHERE data_source_key = $1 AND is_enabled = true
       ORDER BY created_at ASC LIMIT 1 FOR UPDATE`,
      [dataSourceKey],
    );
    if (!scheduleRes.rowCount) {
      await client.query('ROLLBACK');
      // No enabled schedule for this source. Demands persist but nothing to
      // mutate. Returning identity-ish result keeps callers simple.
      return {
        dataSourceKey,
        effectiveCron: '',
        changed: false,
        appliedDemandCount: 0,
        cappedAt: null,
      };
    }
    const schedule = scheduleRes.rows[0];

    const demandsRes = await client.query<{ requested_cron: string }>(
      `SELECT requested_cron FROM sync_demand_requests
       WHERE data_source_key = $1 AND expires_at > NOW()`,
      [dataSourceKey],
    );
    const demandCrons = demandsRes.rows.map(r => r.requested_cron);

    const capRes = await client.query<{ max_frequency_cron: string | null }>(
      `SELECT max_frequency_cron FROM data_sources WHERE key = $1`,
      [dataSourceKey],
    );
    const cap = capRes.rowCount ? capRes.rows[0].max_frequency_cron : null;

    let effectiveCron = schedule.cron_expression;
    let cappedAt: string | null = null;
    if (demandCrons.length > 0) {
      const strictest = strictestCron(demandCrons)!;
      const capped = applyCap(strictest, cap);
      effectiveCron = capped.effective;
      cappedAt = capped.cappedAt;
    }

    const changed = effectiveCron !== schedule.cron_expression;
    const previousCron = schedule.cron_expression;
    if (changed) {
      await client.query(
        `UPDATE sync_schedules SET cron_expression = $1, updated_at = NOW() WHERE id = $2`,
        [effectiveCron, schedule.id],
      );
    }

    await client.query('COMMIT');

    // Subscriber notifications fire AFTER COMMIT so subscribers can't see
    // a notification referring to a cron that didn't land. Best-effort:
    // a notify failure must not surface as an aggregate failure.
    if (changed) {
      const r = await query<{ name: string }>(`SELECT name FROM data_sources WHERE key = $1`, [dataSourceKey]);
      const sourceLabel = r.rowCount ? r.rows[0].name : dataSourceKey;
      await notifySubscribers({
        dataSourceKey,
        event: 'frequency_changed',
        payload: { sourceLabel, newCron: effectiveCron, previousCron },
      }).catch(err => console.error(`[Aggregator] subscriber notify failed for ${dataSourceKey}:`, err));
    }

    return {
      dataSourceKey,
      effectiveCron,
      changed,
      appliedDemandCount: demandCrons.length,
      cappedAt,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Insert a sync_demand_requests row, auto-subscribe the user to the source,
 * and run the aggregator. One transaction-per-step (the aggregator runs its
 * own); the bookkeeping is idempotent enough to recover from partial failure.
 *
 * Returns the new effective cron alongside the demand-row id.
 */
export async function submitDemand(input: {
  dataSourceKey: string;
  requestedCron: string;
  userId: string;
  dashboardContext?: Record<string, unknown>;
  expiresInDays?: number;
}): Promise<{ demandId: string; expiresAt: string; aggregation: AggregateResult }> {
  const days = input.expiresInDays ?? 14;

  const insertRes = await query<{ id: string; expires_at: string }>(
    `INSERT INTO sync_demand_requests
       (data_source_key, requested_cron, user_id, dashboard_context, expires_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW() + ($5 || ' days')::interval)
     RETURNING id, expires_at`,
    [
      input.dataSourceKey,
      input.requestedCron,
      input.userId,
      input.dashboardContext ? JSON.stringify(input.dashboardContext) : null,
      String(days),
    ],
  );
  const demand = insertRes.rows[0];

  await query(
    `INSERT INTO sync_subscribers (subscriber_kind, subscriber_id, data_source_key)
     VALUES ('user', $1, $2)
     ON CONFLICT (subscriber_kind, subscriber_id, data_source_key) DO NOTHING`,
    [input.userId, input.dataSourceKey],
  );

  const aggregation = await aggregate(input.dataSourceKey);
  return { demandId: demand.id, expiresAt: demand.expires_at, aggregation };
}

export const _internals = {
  cronIntervalMinutes,
  compareCronStrictness,
  strictestCron,
  applyCap,
};
