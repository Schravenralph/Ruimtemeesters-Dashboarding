import { Router, type Router as RouterType } from 'express';
import type { Request, Response } from 'express';
import { queryData, queryTimeSeries, getAvailableYears, getDimensions, listSources } from '../controllers/data.controller.js';
import { authenticate } from '../middleware/auth.js';
import { checkDataAccess } from '../middleware/abac-data.js';
import { query } from '../db/pool.js';
import { safeIdent } from '../db/sql-utils.js';
import { getDataSource } from '../services/data-source-registry.js';

const router: RouterType = Router();

router.get('/query', authenticate, checkDataAccess, queryData);
router.get('/timeseries', authenticate, checkDataAccess, queryTimeSeries);
router.get('/sources', authenticate, listSources);
router.get('/years/:source', authenticate, checkDataAccess, getAvailableYears);
router.get('/dimensions/:source', authenticate, checkDataAccess, getDimensions);

// Prognose metadata
//
//   GET /api/data/prognose-meta                               → global summary across data_bevolking
//   GET /api/data/prognose-meta?source=bevolking&geoCode=GM…  → per-tile detail used by the
//     AI Prognose badge tooltip (#149). Returns the TSA model_profile, training window,
//     forecast horizon, refit timestamp and the underlying CBS table id/title so a
//     reader can evaluate the forecast's provenance.
router.get('/prognose-meta', authenticate, async (req: Request, res: Response) => {
  const source = (req.query.source as string | undefined)?.trim();
  const geoCode = (req.query.geoCode as string | undefined)?.trim();

  if (source) {
    const sourceDef = await getDataSource(source);
    if (!sourceDef) {
      res.status(400).json({ error: `Unknown data source: ${source}` });
      return;
    }
    const tbl = safeIdent(sourceDef.tableName);
    // Per-tile detail. geoCode optional — when present, scope to one area;
    // when omitted, summarise the source across all geos.
    const params: unknown[] = [];
    const geoClause = geoCode ? `AND geo_code = $1` : '';
    if (geoCode) params.push(geoCode);

    const detail = await query(
      `SELECT
         MAX(CASE WHEN source = 'cbs_actuals' THEN year END) AS train_end,
         MIN(CASE WHEN source = 'cbs_actuals' THEN year END) AS train_start,
         MIN(CASE WHEN source != 'cbs_actuals' THEN year END) AS forecast_start,
         MAX(CASE WHEN source != 'cbs_actuals' THEN year END) AS forecast_end,
         MAX(forecast_vintage) AS last_refit,
         (ARRAY_AGG(DISTINCT model_profile) FILTER (WHERE model_profile IS NOT NULL))[1] AS model_profile,
         BOOL_OR(source != 'cbs_actuals') AS has_prognose,
         BOOL_OR(confidence_lower IS NOT NULL) AS has_confidence
       FROM ${tbl}
       WHERE 1=1 ${geoClause}`,
      params,
    );
    const row = detail.rows[0];

    // CBS table info from data_sources × cbs_catalog
    const meta = await query(
      `SELECT ds.cbs_table_id, ds.name, cc.title AS cbs_title
       FROM data_sources ds
       LEFT JOIN cbs_catalog cc ON cc.identifier = ds.cbs_table_id
       WHERE ds.key = $1`,
      [source],
    );
    const m = meta.rows[0] ?? {};

    res.json({
      source: 'Ruimtemeesters TSA Engine',
      models: 7, // Prophet / SARIMA / HoltWinters / XGBoost / NeuralProphet / LSTM / StateSpace
      modelProfile: row?.model_profile ?? null,
      hasPrognose: !!row?.has_prognose,
      confidence: row?.has_confidence ? 95 : null,
      trainStart: row?.train_start ? parseInt(row.train_start) : null,
      trainEnd: row?.train_end ? parseInt(row.train_end) : null,
      forecastStart: row?.forecast_start ? parseInt(row.forecast_start) : null,
      forecastEnd: row?.forecast_end ? parseInt(row.forecast_end) : null,
      lastRefit: row?.last_refit ?? null,
      cbsTableId: m.cbs_table_id ?? null,
      cbsTableTitle: m.cbs_title ?? null,
      cbsSourceName: m.name ?? null,
    });
    return;
  }

  // Legacy global summary — kept for PrognoseInfoBanner.
  const result = await query(`
    SELECT
      COUNT(DISTINCT geo_code) as gemeenten,
      MIN(year) as min_year,
      MAX(year) as max_year,
      COUNT(*) as total_rows,
      MAX(forecast_vintage) as last_run
    FROM data_bevolking
    WHERE source = 'ruimtemeesters_prognose'
  `);

  const row = result.rows[0];
  res.json({
    gemeenten: parseInt(row.gemeenten),
    yearRange: row.min_year && row.max_year ? [row.min_year, row.max_year] : null,
    totalRows: parseInt(row.total_rows),
    lastRun: row.last_run,
    source: 'TSA Engine',
    models: 7,
  });
});

export default router;
