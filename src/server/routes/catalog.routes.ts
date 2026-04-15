import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { syncCbsCatalog, searchCatalog, getCatalogThemes } from '../services/cbs/cbs-catalog-sync.js';
import { query } from '../db/pool.js';

const router: Router = Router();

// GET /api/catalog — browse the CBS table catalog
router.get('/', authenticate, async (req: Request, res: Response) => {
  const result = await searchCatalog({
    search: req.query.search as string,
    theme: req.query.theme as string,
    frequency: req.query.frequency as string,
    activated: req.query.activated === 'true' ? true : req.query.activated === 'false' ? false : undefined,
    limit: parseInt(req.query.limit as string) || 50,
    offset: parseInt(req.query.offset as string) || 0,
  });

  res.json(result);
});

// GET /api/catalog/themes — list available CBS themes for filtering
router.get('/themes', authenticate, async (_req: Request, res: Response) => {
  const themes = await getCatalogThemes();
  res.json({ themes });
});

// GET /api/catalog/stats — catalog overview statistics
router.get('/stats', authenticate, async (_req: Request, res: Response) => {
  const [total, activated, lastSync] = await Promise.all([
    query('SELECT COUNT(*) as count FROM cbs_catalog'),
    query('SELECT COUNT(*) as count FROM cbs_catalog WHERE is_activated = true'),
    query("SELECT value FROM system_state WHERE key = 'cbs_catalog_sync'"),
  ]);

  res.json({
    totalTables: parseInt(total.rows[0].count),
    activatedTables: parseInt(activated.rows[0].count),
    lastSync: lastSync.rows[0]?.value || null,
  });
});

// POST /api/catalog/sync — trigger a catalog metadata sync (admin only)
router.post('/sync', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  // Fire and forget
  res.json({ status: 'started' });

  syncCbsCatalog()
    .then(result => console.log(`[CBS Catalog] Sync result: ${result.tablesProcessed} tables, ${result.errors.length} errors`))
    .catch(err => console.error('[CBS Catalog] Sync failed:', err));
});

// GET /api/catalog/:identifier — get details for a specific CBS table
router.get('/:identifier', authenticate, async (req: Request, res: Response) => {
  const result = await query(
    'SELECT * FROM cbs_catalog WHERE identifier = $1',
    [req.params.identifier],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Table not found in catalog' });
    return;
  }

  const row = result.rows[0];

  // Also fetch the CBS table's dimensions/measures for preview
  let dimensions: unknown[] = [];
  try {
    const dimResponse = await fetch(
      `https://datasets.cbs.nl/odata/v1/CBS/${row.identifier}/Dimensions`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (dimResponse.ok) {
      const dimData = await dimResponse.json() as { value: unknown[] };
      dimensions = dimData.value || [];
    }
  } catch { /* CBS might be slow */ }

  res.json({
    ...row,
    dimensions,
  });
});

// --- Subscription routes ---

// GET /api/catalog/subscriptions/mine — list my org's subscribed data sources
router.get('/subscriptions/mine', authenticate, async (req: Request, res: Response) => {
  const orgId = req.user?.organizationId;
  if (!orgId) {
    // No org — return all activated sources (fallback for org-less users)
    const result = await query(`
      SELECT ds.key, ds.name, ds.supercategory, ds.cbs_table_id, ds.unit
      FROM data_sources ds
      ORDER BY ds.sort_order
    `);
    res.json({ subscriptions: result.rows, isOrgScoped: false });
    return;
  }

  const result = await query(`
    SELECT ds.key, ds.name, ds.supercategory, ds.cbs_table_id, ds.unit,
           sub.subscribed_at, sub.sync_enabled, sub.custom_filters
    FROM data_source_subscriptions sub
    JOIN data_sources ds ON ds.key = sub.data_source_key
    WHERE sub.organization_id = $1 AND sub.sync_enabled = true
    ORDER BY ds.sort_order
  `, [orgId]);

  res.json({ subscriptions: result.rows, isOrgScoped: true });
});

// POST /api/catalog/subscriptions — subscribe org to a data source (admin only)
router.post('/subscriptions', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const { dataSourceKey } = req.body as { dataSourceKey: string };
  const orgId = req.user?.organizationId;

  if (!orgId) {
    res.status(400).json({ error: 'No organization associated with this user' });
    return;
  }

  await query(`
    INSERT INTO data_source_subscriptions (organization_id, data_source_key, subscribed_by)
    VALUES ($1, $2, $3)
    ON CONFLICT (organization_id, data_source_key) DO UPDATE SET sync_enabled = true
  `, [orgId, dataSourceKey, req.user?.id]);

  res.json({ status: 'subscribed', dataSourceKey });
});

// DELETE /api/catalog/subscriptions/:key — unsubscribe org from a data source (admin only)
router.delete('/subscriptions/:key', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const orgId = req.user?.organizationId;

  if (!orgId) {
    res.status(400).json({ error: 'No organization associated with this user' });
    return;
  }

  await query(`
    UPDATE data_source_subscriptions SET sync_enabled = false
    WHERE organization_id = $1 AND data_source_key = $2
  `, [orgId, req.params.key]);

  res.json({ status: 'unsubscribed', dataSourceKey: req.params.key });
});

export default router;
