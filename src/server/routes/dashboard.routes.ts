import { Router, type Router as RouterType } from 'express';
import {
  listCustomDashboards,
  createCustomDashboard,
  updateCustomDashboard,
  deleteCustomDashboard,
  shareDashboard,
  getSharedDashboard,
  saveLayout,
  getLayout,
} from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.js';
import { cloneDashboard, cloneThemeToDashboard } from '../controllers/clone.controller.js';

const router: RouterType = Router();

// Custom dashboards
router.get('/custom', authenticate, listCustomDashboards);
router.post('/custom', authenticate, createCustomDashboard);
router.put('/custom/:id', authenticate, updateCustomDashboard);
router.delete('/custom/:id', authenticate, deleteCustomDashboard);
router.post('/custom/:id/share', authenticate, shareDashboard);
router.post('/custom/:id/clone', authenticate, cloneDashboard);
router.post('/clone-theme/:slug', authenticate, cloneThemeToDashboard);
router.get('/shared/:token', getSharedDashboard);

// Layouts
router.get('/layout/:themeId', authenticate, getLayout);
router.put('/layout/:themeId', authenticate, saveLayout);

export default router;
