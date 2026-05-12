import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createUserTemplate, listUserTemplates } from '../controllers/user-template.controller.js';

const router: RouterType = Router();

// EPIC #107 / issues #93 + #94 — any authenticated user can create
// personal templates and list templates by scope (mine/org/public).
// Visibility is enforced at read-time by the controller.
router.get('/', authenticate, listUserTemplates);
router.post('/', authenticate, createUserTemplate);

export default router;
