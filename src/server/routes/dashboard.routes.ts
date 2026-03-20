import { Router } from 'express';
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
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// Custom dashboards
router.get('/custom', authenticate, listCustomDashboards);
router.post('/custom', authenticate, createCustomDashboard);
router.put('/custom/:id', authenticate, updateCustomDashboard);
router.delete('/custom/:id', authenticate, deleteCustomDashboard);
router.post('/custom/:id/share', authenticate, shareDashboard);
router.get('/shared/:token', getSharedDashboard);

// Layouts
router.get('/layout/:themeId', optionalAuth, getLayout);
router.put('/layout/:themeId', authenticate, saveLayout);

export default router;
