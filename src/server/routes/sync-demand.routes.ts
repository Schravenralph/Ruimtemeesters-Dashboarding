import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/auth.js';
import { postSyncDemand } from '../controllers/sync-demand.controller.js';

const router: RouterType = Router();

// ADR-006 — any authenticated user can submit a demand. No role gate;
// the cost guardrail is data_sources.max_frequency_cron, not RBAC.
router.post('/', authenticate, postSyncDemand);

export default router;
