import { Router, type Router as RouterType } from 'express';
import { getDashboardAnalytics } from '../controllers/analytics.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router: RouterType = Router();

router.get('/', authenticate, requireRole('admin'), getDashboardAnalytics);

export default router;
