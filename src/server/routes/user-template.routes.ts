import { Router, type Router as RouterType } from 'express';
import { authenticate } from '../middleware/auth.js';
import { createUserTemplate } from '../controllers/user-template.controller.js';

const router: RouterType = Router();

// EPIC #107 / issue #93 — any authenticated user can create a personal
// template. Visibility flag is honoured on insert; future PRs may add
// ABAC for org/public promotion.
router.post('/', authenticate, createUserTemplate);

export default router;
