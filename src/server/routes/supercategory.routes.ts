import { Router } from 'express';
import { listSupercategories } from '../controllers/supercategory.controller.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();
router.get('/', optionalAuth, listSupercategories);
export default router;
