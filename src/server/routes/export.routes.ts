import { Router } from 'express';
import { exportData } from '../controllers/export.controller.js';
import { authenticate } from '../middleware/auth.js';
import { checkDataAccess } from '../middleware/abac-data.js';

const router = Router();

router.get('/', authenticate, checkDataAccess, exportData);

export default router;
