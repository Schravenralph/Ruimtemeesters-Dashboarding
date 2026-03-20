import { Router } from 'express';
import { getPreferences, updatePreferences } from '../controllers/preferences.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, getPreferences);
router.put('/', authenticate, updatePreferences);

export default router;
