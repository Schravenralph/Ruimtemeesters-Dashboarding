import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
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

// --- Activation routes (admin configures a CBS table for data sync) ---

// POST /api/catalog/activate — activate a CBS table for data sync (admin only)
router.post('/activate', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const {
    identifier,       // CBS table ID, e.g. '83648NED'
    key,              // Local data source key, e.g. 'criminaliteit'
    name,             // Display name, e.g. 'Criminaliteit'
    supercategory,    // e.g. 'veiligheid'
    unit,             // e.g. 'aantal'
    measureCode,      // CBS measure to sync, e.g. 'M004200_2'
    filter,           // OData filter, e.g. "SoortMisdrijf eq 'T001722'"
    dimensionMappings, // Array of {cbsDimension, targetColumn, valueMap}
  } = req.body as {
    identifier: string;
    key: string;
    name: string;
    supercategory: string;
    unit: string;
    measureCode: string;
    filter: string;
    dimensionMappings: Array<{ cbsDimension: string; targetColumn: string; valueMap: Record<string, string> }>;
  };

  if (!identifier || !key || !name || !measureCode) {
    res.status(400).json({ error: 'Missing required fields: identifier, key, name, measureCode' });
    return;
  }

  const tableName = `data_${key.replace(/[^a-z0-9_]/g, '_')}`;
  const dimColumns = dimensionMappings.map(d => d.targetColumn);

  // Build sync_config for the generic sync engine
  const syncConfig = {
    cbsTable: identifier,
    targetTable: tableName,
    filter: filter || `Measure eq '${measureCode}'`,
    measureCode,
    dimensionMappings: dimensionMappings || [],
  };

  const client = await (await import('../db/pool.js')).getClient();
  try {
    await client.query('BEGIN');

    // 1. Create the data table dynamically
    const dimColumnsDDL = dimColumns.map(c => `${c} VARCHAR(100)`).join(', ');
    const uniqueCols = ['geo_code', 'year', ...dimColumns, 'source'].join(', ');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        geo_code VARCHAR(20) NOT NULL REFERENCES geo_areas(code),
        year INTEGER NOT NULL,
        ${dimColumnsDDL ? dimColumnsDDL + ',' : ''}
        value NUMERIC,
        source VARCHAR(50) DEFAULT 'cbs_actuals',
        confidence_lower NUMERIC,
        confidence_upper NUMERIC,
        model_profile VARCHAR(50),
        forecast_vintage TIMESTAMPTZ,
        UNIQUE(${uniqueCols})
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_${key}_geo_year ON ${tableName}(geo_code, year)`);

    // 2. Register in data_sources
    await client.query(`
      INSERT INTO data_sources (key, name, supercategory, table_name, dimension_columns, value_column, unit, cbs_table_id, sync_config, sort_order)
      VALUES ($1, $2, $3, $4, $5, 'value', $6, $7, $8,
              (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM data_sources))
      ON CONFLICT (key) DO UPDATE SET
        name = EXCLUDED.name, sync_config = EXCLUDED.sync_config, cbs_table_id = EXCLUDED.cbs_table_id
    `, [key, name, supercategory, tableName, dimColumns, unit, identifier, JSON.stringify(syncConfig)]);

    // 3. Mark as activated in catalog
    await client.query(`
      UPDATE cbs_catalog SET is_activated = true, data_source_key = $1
      WHERE identifier = $2
    `, [key, identifier]);

    // 4. Auto-create a theme with default tiles
    // Use slug-based upsert to get the ID back (works whether theme is new or existing)
    const themeResult = await client.query(`
      INSERT INTO themes (slug, name, description, icon, "order", is_system, supercategory)
      VALUES ($1, $2, $3, 'BarChart3',
              (SELECT COALESCE(MAX("order"), 0) + 1 FROM themes WHERE supercategory = $4),
              true, $4)
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
      RETURNING id
    `, [key, name, `CBS tabel ${identifier} — ${name}`, supercategory]);
    const themeId = themeResult.rows[0].id;

    // Remove any existing tiles for this theme (re-activation replaces them)
    await client.query('DELETE FROM tiles WHERE theme_id = $1', [themeId]);

    // Default tiles: trend line, dimension bar chart, data table
    const defaultTiles = [
      { title: `${name} trend`, chartType: 'line', dims: [] as string[], order: 0 },
      ...(dimColumns.length > 0 ? [{ title: `${name} per ${dimColumns[0]}`, chartType: 'bar', dims: [dimColumns[0]], order: 1 }] : []),
      { title: `${name} per gemeente`, chartType: 'choropleth', dims: [] as string[], order: dimColumns.length > 0 ? 2 : 1 },
      { title: `${name} tabel`, chartType: 'table', dims: dimColumns.slice(0, 1), order: dimColumns.length > 0 ? 3 : 2 },
    ];

    for (const tile of defaultTiles) {
      await client.query(`
        INSERT INTO tiles (theme_id, title, chart_type, data_source, dimensions, default_geo_level, "order")
        VALUES ($1, $2, $3, $4, $5, 'gemeente', $6)
      `, [themeId, tile.title, tile.chartType, key, tile.dims, tile.order]);
    }

    await client.query('COMMIT');

    // 5. Invalidate data source cache
    const { invalidateCache } = await import('../services/data-source-registry.js');
    invalidateCache();

    // 6. Trigger background data sync
    (async () => {
      try {
        const dsResult = await query(
          'SELECT key, sync_config FROM data_sources WHERE key = $1 AND sync_config IS NOT NULL',
          [key],
        );
        if (dsResult.rows.length > 0) {
          const { syncGeneric } = await import('../services/cbs/cbs-generic-sync.js');
          const result = await syncGeneric(dsResult.rows[0].key, dsResult.rows[0].sync_config);
          console.log(`[Catalog] Auto-sync ${key}: ${result.rowsInserted} rows in ${result.duration}ms`);
        }
      } catch (err) {
        console.error(`[Catalog] Auto-sync ${key} failed:`, err);
      }
    })();

    res.json({
      status: 'activated',
      key,
      tableName,
      dimensionColumns: dimColumns,
      themeSlug: key,
      tilesCreated: defaultTiles.length,
      message: `Tabel geactiveerd. Thema "${name}" aangemaakt met ${defaultTiles.length} tegels. Data sync gestart op de achtergrond.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err instanceof Error ? err.message : 'Activation failed' });
  } finally {
    client.release();
  }
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
