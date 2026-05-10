import { Router, type Router as RouterType } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createProject, listProjects, getProject, patchProject } from '../controllers/project.controller.js';

const router: RouterType = Router();
router.get('/', authenticate, listProjects);
router.post('/', authenticate, requireRole('admin', 'editor'), createProject);
router.get('/:idOrSlug', authenticate, getProject);
router.patch('/:id', authenticate, requireRole('admin', 'editor'), patchProject);
export default router;
