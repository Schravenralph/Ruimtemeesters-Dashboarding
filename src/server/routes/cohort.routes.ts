import { Router, type Router as RouterType } from 'express';
import { getCohortMemberships } from '../controllers/cohort.controller.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();
router.get('/:gemeenteCode', authenticate, getCohortMemberships);
export default router;
