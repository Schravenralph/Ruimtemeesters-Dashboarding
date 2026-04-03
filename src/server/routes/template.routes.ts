import { Router, type Router as RouterType } from 'express';
import { listTemplates, useTemplate } from '../controllers/template.controller.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();

router.get('/', authenticate, listTemplates);
router.post('/:id/use', authenticate, useTemplate);

export default router;
