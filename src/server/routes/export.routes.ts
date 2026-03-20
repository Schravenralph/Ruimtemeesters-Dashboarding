import { Router } from 'express';
import { exportData } from '../controllers/export.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, exportData);

export default router;
