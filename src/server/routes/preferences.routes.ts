import { Router, type Router as RouterType } from 'express';
import { getPreferences, updatePreferences } from '../controllers/preferences.controller.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();

router.get('/', authenticate, getPreferences);
router.put('/', authenticate, updatePreferences);

export default router;
