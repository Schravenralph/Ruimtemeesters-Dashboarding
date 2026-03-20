import { Router } from 'express';
import { importData, getImportHistory } from '../controllers/import.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, requireRole('admin', 'editor'), importData);
router.get('/history', authenticate, requireRole('admin'), getImportHistory);

export default router;
