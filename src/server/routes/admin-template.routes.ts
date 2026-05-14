import { Router, type Router as RouterType } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  promoteTemplate,
  listPromotedTemplates,
  listPromotionCandidates,
} from '../controllers/admin-template.controller.js';

const router: RouterType = Router();

// Issue #96 (EPIC #107). Admin-only promotion of user_templates →
// dashboard_templates with lineage + audit log. See ADR-005.
router.get('/candidates', authenticate, requireRole('admin'), listPromotionCandidates);
router.get('/promoted', authenticate, requireRole('admin'), listPromotedTemplates);
router.post('/promote', authenticate, requireRole('admin'), promoteTemplate);

export default router;
