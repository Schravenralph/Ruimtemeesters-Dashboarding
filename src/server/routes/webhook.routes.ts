import { Router } from 'express';
import { listWebhooks, createWebhook, deleteWebhook } from '../controllers/webhook.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, listWebhooks);
router.post('/', authenticate, createWebhook);
router.delete('/:id', authenticate, deleteWebhook);

export default router;
