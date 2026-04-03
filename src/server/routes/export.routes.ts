import { Router, type Router as RouterType } from 'express';
import { exportData } from '../controllers/export.controller.js';
import { authenticate } from '../middleware/auth.js';
import { checkDataAccess } from '../middleware/abac-data.js';

const router: RouterType = Router();

router.get('/', authenticate, checkDataAccess, exportData);

export default router;
