import { Router } from 'express';
import { queryData, queryTimeSeries, getAvailableYears, getDimensions } from '../controllers/data.controller.js';
import { authenticate } from '../middleware/auth.js';
import { checkDataAccess } from '../middleware/abac-data.js';

const router = Router();

router.get('/query', authenticate, checkDataAccess, queryData);
router.get('/timeseries', authenticate, checkDataAccess, queryTimeSeries);
router.get('/years/:source', authenticate, checkDataAccess, getAvailableYears);
router.get('/dimensions/:source', authenticate, checkDataAccess, getDimensions);

export default router;
