import { Router } from 'express';
import { getOverviewStats, getTimeSeriesAgg } from '../controllers/stats.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/overview', optionalAuth, getOverviewStats);
router.get('/timeseries/:source', optionalAuth, getTimeSeriesAgg);

export default router;
