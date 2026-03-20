import { Router } from 'express';
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/api-key.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.post('/', authenticate, createApiKey);
router.get('/', authenticate, listApiKeys);
router.delete('/:id', authenticate, revokeApiKey);

export default router;
