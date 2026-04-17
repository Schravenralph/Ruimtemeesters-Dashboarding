import { Router } from 'express';
import type { Request, Response } from 'express';
import cron from 'node-cron';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/pool.js';
import { reloadSyncScheduler, runScheduleNow } from '../services/cbs/sync-scheduler.js';
import { notifySyncFinished } from '../services/cbs/sync-notifier.js';

const router: Router = Router();

const LEGACY_SOURCES = ['bevolking', 'huishoudens', 'woningen', 'huishoudens-leeftijd', 'woningmutaties', 'woningtekort', 'prognose'];

// GET /api/sync/status — row counts and source breakdown for all data tables
router.get('/status', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  const tables = [
    'data_bevolking', 'data_huishoudens', 'data_woningen', 'data_woningtekort',
    'data_energie', 'data_emissies', 'data_hernieuwbaar', 'data_afval',
  ];
  const results = [];
  for (const table of tables) {
    try {
      const countResult = await query(`SELECT count(*) as count FROM ${table}`);
      const sourceResult = await query(`SELECT source, count(*)::text as count FROM ${table} GROUP BY source ORDER BY source`);
      const yearResult = await query(`SELECT min(year) as min_year, max(year) as max_year FROM ${table}`);
      results.push({
        table,
        totalRows: parseInt(countResult.rows[0].count as string),
        sources: sourceResult.rows.map((r) => ({ source: r.source as string, count: parseInt(r.count as string) })),
        minYear: yearResult.rows[0]?.min_year,
        maxYear: yearResult.rows[0]?.max_year,
      });
    } catch {
      results.push({ table, totalRows: 0, sources: [], minYear: null, maxYear: null });
    }
  }

  // Also get data_sources registry
  const dsResult = await query('SELECT key, name, supercategory, table_name, cbs_table_id, sync_config IS NOT NULL as has_sync FROM data_sources ORDER BY supercategory, sort_order');

  res.json({ tables: results, dataSources: dsResult.rows, legacySources: LEGACY_SOURCES });
});

// POST /api/sync/run — trigger a CBS sync
router.post('/run', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const { source, year } = req.body as { source?: string; year?: number };

  const startTime = Date.now();

  // Run in background
  (async () => {
    try {
      if (source && LEGACY_SOURCES.includes(source)) {
        const mod = await import('../services/cbs/cbs-sync.js');
        switch (source) {
          case 'bevolking': await mod.syncBevolking(year); break;
          case 'huishoudens': await mod.syncHuishoudens(year); break;
          case 'woningen': await mod.syncWoningen(year); break;
          case 'huishoudens-leeftijd': await mod.syncHuishoudensLeeftijd(year); break;
          case 'woningmutaties': await mod.syncWoningmutaties(year); break;
          case 'woningtekort': await mod.calculateWoningtekort(year || 2024); break;
          case 'prognose': await mod.syncPrognose(); break;
        }
      } else if (source) {
        // Try generic sync from registry
        const dsResult = await query(
          'SELECT key, sync_config FROM data_sources WHERE key = $1 AND sync_config IS NOT NULL',
          [source],
        );
        if (dsResult.rows.length > 0) {
          const { syncGeneric } = await import('../services/cbs/cbs-generic-sync.js');
          const result = await syncGeneric(dsResult.rows[0].key, dsResult.rows[0].sync_config, {
            yearFilter: year,
            trigger: 'manual',
            triggeredBy: req.user?.id ?? null,
          });
          if (result.errors.length > 0) {
            console.error(`[SYNC] ${source} completed with errors: ${result.errors.join(' | ')}`);
          }
          // Notify the triggering admin on failure (manual triggers don't spam on success).
          if (req.user?.id) {
            await notifySyncFinished(result, {
              recipientUserId: req.user.id,
              notifyEmail: true,
              notifyInApp: true,
              notifyOn: 'failure',
              sourceLabel: dsResult.rows[0].key,
              trigger: 'manual',
            });
          }
        }
      } else {
        // Sync all
        const mod = await import('../services/cbs/cbs-sync.js');
        await mod.syncAllCbsData(year);
      }
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[SYNC] Completed ${source || 'all'} in ${duration}s`);
    } catch (err) {
      console.error(`[SYNC] Failed:`, err);
    }
  })();

  res.json({ status: 'started', source: source || 'all', year: year || 'all' });
});

// --- TSA forecast run tracking (in-memory) ---
// Tracks the current/last forecast run so the UI can poll for completion.
let forecastRun: {
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  result?: unknown;
  error?: string;
} | null = null;

const TSA_URL = () => process.env.TSA_API_URL || 'http://tsa-engine:8100';
const TSA_KEY = () => process.env.TSA_API_KEY || process.env.SERVICE_API_KEY || '';

// POST /api/sync/forecast — trigger a TSA forecast run (fire-and-forget)
// Responds immediately so the browser won't timeout on long-running forecasts.
// The TSA runs server-side; poll GET /api/sync/forecast/status to track progress.
router.post('/forecast', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  if (forecastRun?.status === 'running') {
    res.status(409).json({ error: 'Forecast already running', startedAt: forecastRun.startedAt });
    return;
  }

  const yearsAhead = Number(req.body?.years_ahead) || 5;

  // Check TSA is reachable before starting
  try {
    const health = await fetch(`${TSA_URL()}/health`);
    if (!health.ok) {
      res.status(502).json({ error: 'TSA engine not healthy' });
      return;
    }
  } catch (err) {
    res.status(502).json({ error: `TSA unreachable: ${(err as Error).message}` });
    return;
  }

  // Fire and forget — respond immediately, run in background
  forecastRun = { status: 'running', startedAt: new Date().toISOString() };
  res.json({ status: 'started', startedAt: forecastRun.startedAt });

  // Background: call TSA and track result
  fetch(`${TSA_URL()}/api/v1/forecast/bevolking`, {
    method: 'POST',
    headers: { 'X-API-Key': TSA_KEY(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ years_ahead: yearsAhead }),
  })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text();
        forecastRun = { ...forecastRun!, status: 'failed', completedAt: new Date().toISOString(), error: `TSA returned ${response.status}: ${text}` };
        console.error(`[TSA] Forecast failed: ${response.status}`);
        return;
      }
      const result = await response.json();
      forecastRun = { ...forecastRun!, status: 'completed', completedAt: new Date().toISOString(), result };
      console.log(`[TSA] Forecast completed: ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      forecastRun = { ...forecastRun!, status: 'failed', completedAt: new Date().toISOString(), error: (err as Error).message };
      console.error(`[TSA] Forecast error: ${(err as Error).message}`);
    });
});

// GET /api/sync/forecast/status — check TSA engine status + current run status
router.get('/forecast/status', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  try {
    const [healthRes, modelsRes] = await Promise.all([
      fetch(`${TSA_URL()}/health`),
      fetch(`${TSA_URL()}/api/v1/models/status`, { headers: { 'X-API-Key': TSA_KEY() } }),
    ]);

    const health = await healthRes.json();
    const models = modelsRes.ok ? await modelsRes.json() : null;

    res.json({ health, models, forecastRun });
  } catch (err) {
    res.json({ health: { status: 'unreachable', error: (err as Error).message }, models: null, forecastRun });
  }
});

// --- Sync schedules (user-definable cron rules) ---

// GET /api/sync/schedules — list all schedules
router.get('/schedules', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  const result = await query(`
    SELECT s.id, s.data_source_key, s.cron_expression, s.timezone, s.year_filter,
           s.is_enabled, s.notify_email, s.notify_in_app, s.notify_on,
           s.last_run_at, s.last_run_status, s.created_at, s.updated_at,
           ds.name AS source_name
    FROM sync_schedules s
    JOIN data_sources ds ON ds.key = s.data_source_key
    ORDER BY ds.name, s.cron_expression
  `);
  res.json({ schedules: result.rows });
});

// POST /api/sync/schedules — create a schedule
router.post('/schedules', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const {
    dataSourceKey, cronExpression, timezone, yearFilter,
    notifyEmail, notifyInApp, notifyOn, isEnabled,
  } = req.body as {
    dataSourceKey: string; cronExpression: string; timezone?: string;
    yearFilter?: number | null; notifyEmail?: boolean; notifyInApp?: boolean;
    notifyOn?: 'always' | 'failure' | 'never'; isEnabled?: boolean;
  };

  if (!dataSourceKey || !cronExpression) {
    res.status(400).json({ error: 'dataSourceKey and cronExpression are required' });
    return;
  }
  if (!cron.validate(cronExpression)) {
    res.status(400).json({ error: `Invalid cron expression: "${cronExpression}"` });
    return;
  }
  // Ensure the data source exists and has a sync_config.
  const ds = await query(
    "SELECT key, sync_config FROM data_sources WHERE key = $1",
    [dataSourceKey],
  );
  if (ds.rows.length === 0) {
    res.status(404).json({ error: `Unknown data source: ${dataSourceKey}` });
    return;
  }
  if (!ds.rows[0].sync_config) {
    res.status(400).json({ error: `Data source ${dataSourceKey} has no sync_config; only generic sources are schedulable via this endpoint` });
    return;
  }

  const result = await query(
    `INSERT INTO sync_schedules
       (data_source_key, cron_expression, timezone, year_filter,
        notify_email, notify_in_app, notify_on, is_enabled, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (data_source_key, cron_expression) DO UPDATE SET
       timezone = EXCLUDED.timezone,
       year_filter = EXCLUDED.year_filter,
       notify_email = EXCLUDED.notify_email,
       notify_in_app = EXCLUDED.notify_in_app,
       notify_on = EXCLUDED.notify_on,
       is_enabled = EXCLUDED.is_enabled,
       updated_at = NOW()
     RETURNING *`,
    [
      dataSourceKey, cronExpression, timezone || 'Europe/Amsterdam',
      yearFilter ?? null,
      notifyEmail ?? true, notifyInApp ?? true, notifyOn ?? 'failure',
      isEnabled ?? true, req.user?.id ?? null,
    ],
  );

  await reloadSyncScheduler();
  res.json({ schedule: result.rows[0] });
});

// PATCH /api/sync/schedules/:id — update a schedule
router.patch('/schedules/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const id = req.params.id;
  const body = req.body as Record<string, unknown>;

  if (typeof body.cronExpression === 'string' && !cron.validate(body.cronExpression)) {
    res.status(400).json({ error: `Invalid cron expression: "${body.cronExpression}"` });
    return;
  }

  const allowed: Record<string, string> = {
    cronExpression: 'cron_expression',
    timezone: 'timezone',
    yearFilter: 'year_filter',
    isEnabled: 'is_enabled',
    notifyEmail: 'notify_email',
    notifyInApp: 'notify_in_app',
    notifyOn: 'notify_on',
  };
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [apiKey, col] of Object.entries(allowed)) {
    if (body[apiKey] !== undefined) {
      params.push(body[apiKey]);
      sets.push(`${col} = $${params.length}`);
    }
  }
  if (sets.length === 0) {
    res.status(400).json({ error: 'No updatable fields provided' });
    return;
  }
  params.push(id);
  const result = await query(
    `UPDATE sync_schedules SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params,
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Schedule not found' });
    return;
  }
  await reloadSyncScheduler();
  res.json({ schedule: result.rows[0] });
});

// DELETE /api/sync/schedules/:id
router.delete('/schedules/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const result = await query('DELETE FROM sync_schedules WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Schedule not found' });
    return;
  }
  await reloadSyncScheduler();
  res.json({ status: 'deleted', id: req.params.id });
});

// POST /api/sync/schedules/:id/run — fire a schedule immediately (manual)
router.post('/schedules/:id/run', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const id = String(req.params.id);
  res.json({ status: 'started', id });
  runScheduleNow(id).catch(err =>
    console.error(`[Sync] schedule ${id} manual run crashed:`, err),
  );
});

// GET /api/sync/runs — recent sync_runs across all sources
router.get('/runs', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const source = req.query.source as string | undefined;
  const params: unknown[] = [];
  let where = '';
  if (source) {
    params.push(source);
    where = 'WHERE data_source_key = $1';
  }
  const result = await query(
    `SELECT id, data_source_key, cbs_table_id, trigger, started_at, finished_at,
            status, rows_fetched, rows_inserted, duration_ms, error_message
     FROM sync_runs ${where}
     ORDER BY started_at DESC LIMIT ${limit}`,
    params,
  );
  res.json({ runs: result.rows });
});

export default router;
