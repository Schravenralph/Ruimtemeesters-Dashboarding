import type { Request, Response } from 'express';
import { submitDemand } from '../services/sync/aggregator.service.js';

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
