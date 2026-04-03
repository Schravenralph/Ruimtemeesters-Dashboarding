import { Router, type Router as RouterType } from 'express';
import { getDataSourceStats } from '../controllers/datasource.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router: RouterType = Router();

router.get('/stats', authenticate, requireRole('admin'), getDataSourceStats);

export default router;
