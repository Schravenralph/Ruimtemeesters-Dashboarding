import { Router } from 'express';
import { listThemes, getTheme } from '../controllers/theme.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, listThemes);
router.get('/:slug', optionalAuth, getTheme);

export default router;
