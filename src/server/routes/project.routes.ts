import { Router, type Router as RouterType } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import {
  createProject, listProjects, getProject, patchProject,
  getProjectDashboard, putProjectDashboardLayout,
  getThemeDiff, postThemeApply,
} from '../controllers/project.controller.js';

const router: RouterType = Router();
router.get('/', authenticate, listProjects);
router.post('/', authenticate, requireRole('admin', 'editor'), createProject);
router.get('/:idOrSlug', authenticate, getProject);
router.patch('/:id', authenticate, requireRole('admin', 'editor'), patchProject);
router.get('/:idOrSlug/dashboards/:dashboardSlug', authenticate, getProjectDashboard);
router.put('/:idOrSlug/dashboards/:dashboardSlug/layout', authenticate, requireRole('admin', 'editor'), putProjectDashboardLayout);
router.get('/:idOrSlug/dashboards/:dashboardSlug/theme-diff', authenticate, getThemeDiff);
router.post('/:idOrSlug/dashboards/:dashboardSlug/theme-apply', authenticate, requireRole('admin', 'editor'), postThemeApply);
export default router;
