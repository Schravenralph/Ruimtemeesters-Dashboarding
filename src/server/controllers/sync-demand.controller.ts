import type { Request, Response } from 'express';
import { submitDemand } from '../services/sync/aggregator.service.js';
import { query } from '../db/pool.js';

/**
 * POST /api/sync-demands
 * ADR-006. Authenticated user submits a (dataSourceKey, requestedCron) demand;
 * the controller inserts a row, auto-subscribes the user, and runs the
 * aggregator. Returns the demand id + new effective cron.
 *
 * No org check. Global-pull invariant — a user's demand elevates the GLOBAL
 * sync_schedules row; other orgs benefit automatically.
 */
export async function postSyncDemand(req: Request, res: Response): Promise<void> {
  const user = req.user;
  if (!user) { res.status(401).json({ error: 'Authentication required' }); return; }

  const { dataSourceKey, requestedCron, dashboardContext, expiresInDays } = req.body ?? {};
  if (typeof dataSourceKey !== 'string' || !dataSourceKey) {
    res.status(400).json({ error: 'dataSourceKey is required' });
    return;
  }
  if (typeof requestedCron !== 'string' || !requestedCron.trim()) {
    res.status(400).json({ error: 'requestedCron is required' });
    return;
  }
  if (dashboardContext !== undefined && (typeof dashboardContext !== 'object' || dashboardContext === null || Array.isArray(dashboardContext))) {
    res.status(400).json({ error: 'dashboardContext must be an object' });
    return;
  }
  if (expiresInDays !== undefined && (typeof expiresInDays !== 'number' || expiresInDays <= 0 || expiresInDays > 90)) {
    res.status(400).json({ error: 'expiresInDays must be 1-90' });
    return;
  }

  try {
    const result = await submitDemand({
      dataSourceKey,
      requestedCron: requestedCron.trim(),
      userId: user.id,
      dashboardContext: dashboardContext as Record<string, unknown> | undefined,
      expiresInDays,
    });
    res.status(201).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Demand submission failed';
    res.status(500).json({ error: msg });
  }
}

/**
 * GET /api/admin/sync-demands
 * Admin-only aggregate of demand activity per data_source. Mirrors the
 * ThemeReadiness pattern: one row per source, summary chips above.
 */
export async function getSyncDemandsAdmin(_req: Request, res: Response): Promise<void> {
  const result = await query<{
    data_source_key: string;
    name: string;
    active_demand_count: string;
    expired_demand_count: string;
    strictest_active_cron: string | null;
    current_schedule_cron: string | null;
    max_frequency_cron: string | null;
    oldest_expiry: string | null;
  }>(
    `WITH demand_agg AS (
       SELECT
         data_source_key,
         COUNT(*) FILTER (WHERE expires_at > NOW()) AS active_count,
         COUNT(*) FILTER (WHERE expires_at <= NOW()) AS expired_count,
         MIN(expires_at) FILTER (WHERE expires_at > NOW()) AS oldest_active_expiry,
         (
           SELECT requested_cron
           FROM sync_demand_requests x
           WHERE x.data_source_key = sdr.data_source_key
             AND x.expires_at > NOW()
           ORDER BY x.requested_cron ASC
           LIMIT 1
         ) AS strictest_active_cron
       FROM sync_demand_requests sdr
       GROUP BY data_source_key
     )
     SELECT
       ds.key AS data_source_key,
       ds.name,
       COALESCE(d.active_count, 0)::text AS active_demand_count,
       COALESCE(d.expired_count, 0)::text AS expired_demand_count,
       d.strictest_active_cron,
       (SELECT cron_expression FROM sync_schedules s
        WHERE s.data_source_key = ds.key AND s.is_enabled
        ORDER BY s.created_at ASC LIMIT 1) AS current_schedule_cron,
       ds.max_frequency_cron,
       d.oldest_active_expiry::text AS oldest_expiry
     FROM data_sources ds
     JOIN demand_agg d ON d.data_source_key = ds.key
     ORDER BY d.active_count DESC, ds.key ASC`,
  );

  res.json({
    rows: result.rows.map(r => ({
      dataSourceKey: r.data_source_key,
      name: r.name,
      activeDemandCount: Number(r.active_demand_count),
      expiredDemandCount: Number(r.expired_demand_count),
      strictestActiveCron: r.strictest_active_cron,
      currentScheduleCron: r.current_schedule_cron,
      maxFrequencyCron: r.max_frequency_cron,
      oldestExpiry: r.oldest_expiry,
    })),
  });
}
