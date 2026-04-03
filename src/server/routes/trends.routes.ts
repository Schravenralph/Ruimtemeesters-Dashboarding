import { Router } from 'express';
import { getTrends, compareTrends } from '../controllers/trends.controller.js';
import { authenticate } from '../middleware/auth.js';
import { checkDataAccess } from '../middleware/abac-data.js';

const router = Router();

router.get('/:source', authenticate, checkDataAccess, getTrends);
router.get('/:source/compare', authenticate, checkDataAccess, compareTrends);

export default router;
