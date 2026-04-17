import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { query } from '../db/pool.js';

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

export default router;
