import { Router } from 'express';
import { listSupercategories } from '../controllers/supercategory.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.get('/', authenticate, listSupercategories);
export default router;
