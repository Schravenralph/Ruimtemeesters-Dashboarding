import { Router, type Router as RouterType } from 'express';
import { listSupercategories } from '../controllers/supercategory.controller.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();
router.get('/', authenticate, listSupercategories);
export default router;
