import { Router, type Router as RouterType } from 'express';
import type { Request, Response } from 'express';
import { queryData, queryTimeSeries, getAvailableYears, getDimensions, listSources } from '../controllers/data.controller.js';
import { authenticate } from '../middleware/auth.js';
import { checkDataAccess } from '../middleware/abac-data.js';
import { query } from '../db/pool.js';

const router: RouterType = Router();

router.get('/query', authenticate, checkDataAccess, queryData);
router.get('/timeseries', authenticate, checkDataAccess, queryTimeSeries);
router.get('/sources', authenticate, listSources);
router.get('/years/:source', authenticate, checkDataAccess, getAvailableYears);
router.get('/dimensions/:source', authenticate, checkDataAccess, getDimensions);

// Prognose metadata — summary of TSA forecast data available
router.get('/prognose-meta', authenticate, async (_req: Request, res: Response) => {
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
