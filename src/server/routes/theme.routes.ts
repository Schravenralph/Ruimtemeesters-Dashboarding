import { Router, type Router as RouterType } from 'express';
import { listThemes, getTheme } from '../controllers/theme.controller.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();

router.get('/', authenticate, listThemes);
router.get('/:slug', authenticate, getTheme);

export default router;
