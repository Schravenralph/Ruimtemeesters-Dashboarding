import { Router, type Router as RouterType } from 'express';
import { createTheme, updateTheme, deleteTheme, addTileToTheme, removeTileFromTheme } from '../controllers/theme-admin.controller.js';
import { getThemeReadiness } from '../controllers/theme-readiness.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router: RouterType = Router();

router.get('/readiness', authenticate, requireRole('admin'), getThemeReadiness);
router.post('/', authenticate, requireRole('admin'), createTheme);
router.put('/:id', authenticate, requireRole('admin'), updateTheme);
router.delete('/:id', authenticate, requireRole('admin'), deleteTheme);
router.post('/:id/tiles', authenticate, requireRole('admin'), addTileToTheme);
router.delete('/:id/tiles/:tileId', authenticate, requireRole('admin'), removeTileFromTheme);

export default router;
