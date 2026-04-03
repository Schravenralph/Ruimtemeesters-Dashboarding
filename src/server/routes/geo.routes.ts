import { Router } from 'express';
import { listAreas, getArea, getChildren, geocodeAddress } from '../controllers/geo.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, listAreas);
router.get('/geocode', authenticate, geocodeAddress);
router.get('/:code', authenticate, getArea);
router.get('/:code/children', authenticate, getChildren);

export default router;
