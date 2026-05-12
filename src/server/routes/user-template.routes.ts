import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createUserTemplate, listUserTemplates, updateUserTemplate } from '../controllers/user-template.controller.js';

const router: RouterType = Router();

// EPIC #107 / issues #93 + #94 + #95 — any authenticated user can create
// personal templates, list templates by scope (mine/org/public), and
// edit metadata (name, description, visibility) on their own rows.
// Visibility is enforced at read-time and write-time by the controller.
router.get('/', authenticate, listUserTemplates);
router.post('/', authenticate, createUserTemplate);
router.patch('/:id', authenticate, updateUserTemplate);

export default router;
