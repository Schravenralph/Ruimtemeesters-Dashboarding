import { Router, type Router as RouterType } from 'express';
import { listNotifications, markAsRead } from '../controllers/notification.controller.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();

router.get('/', authenticate, listNotifications);
router.put('/:id/read', authenticate, markAsRead);

export default router;
