import { Router } from 'express';
import { listTemplates, useTemplate } from '../controllers/template.controller.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, listTemplates);
router.post('/:id/use', authenticate, useTemplate);

export default router;
