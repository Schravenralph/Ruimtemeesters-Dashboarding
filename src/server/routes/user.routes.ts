import { Router, type Router as RouterType } from 'express';
import { listUsers, updateUser, deleteUser, resetUserPassword, listOrganizations } from '../controllers/user.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router: RouterType = Router();

router.get('/', authenticate, requireRole('admin'), listUsers);
router.put('/:id', authenticate, requireRole('admin'), updateUser);
router.delete('/:id', authenticate, requireRole('admin'), deleteUser);
router.post('/:id/reset-password', authenticate, requireRole('admin'), resetUserPassword);
router.get('/organizations', authenticate, requireRole('admin'), listOrganizations);

export default router;
