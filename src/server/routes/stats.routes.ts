import { Router, type Router as RouterType } from 'express';
import { getOverviewStats, getTimeSeriesAgg } from '../controllers/stats.controller.js';
import { authenticate } from '../middleware/auth.js';
import { checkDataAccess } from '../middleware/abac-data.js';

const router: RouterType = Router();

router.get('/overview', authenticate, getOverviewStats);
router.get('/timeseries/:source', authenticate, checkDataAccess, getTimeSeriesAgg);

export default router;
