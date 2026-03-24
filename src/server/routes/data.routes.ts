import { Router } from 'express';
import { queryData, queryTimeSeries, getAvailableYears, getDimensions } from '../controllers/data.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/query', optionalAuth, queryData);
router.get('/timeseries', optionalAuth, queryTimeSeries);
router.get('/years/:source', optionalAuth, getAvailableYears);
router.get('/dimensions/:source', optionalAuth, getDimensions);

export default router;
