import { Router, type Router as RouterType } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getSyncDemandsAdmin } from '../controllers/sync-demand.controller.js';

const router: RouterType = Router();

// Admin-only aggregate of sync demand activity. Read-only for v1; overrides
// land in a future cycle if abuse pattern emerges.
router.get('/', authenticate, requireRole('admin'), getSyncDemandsAdmin);

export default router;
