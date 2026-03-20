import { Router } from 'express';
import { getTrends, compareTrends } from '../controllers/trends.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/:source', optionalAuth, getTrends);
router.get('/:source/compare', optionalAuth, compareTrends);

export default router;
