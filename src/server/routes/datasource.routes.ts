import { Router } from 'express';
import { getDataSourceStats } from '../controllers/datasource.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/stats', authenticate, requireRole('admin'), getDataSourceStats);

export default router;
