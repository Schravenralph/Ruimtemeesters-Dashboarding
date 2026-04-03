import { Router, type Router as RouterType } from 'express';
import { login, me, register } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticate, me);

export default router;
