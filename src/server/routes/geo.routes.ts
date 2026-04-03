import { Router, type Router as RouterType } from 'express';
import { listAreas, getArea, getChildren, geocodeAddress, getGeoJson } from '../controllers/geo.controller.js';
import { authenticate } from '../middleware/auth.js';

const router: RouterType = Router();

router.get('/', authenticate, listAreas);
router.get('/geocode', authenticate, geocodeAddress);
router.get('/geojson', authenticate, getGeoJson);
router.get('/:code', authenticate, getArea);
router.get('/:code/children', authenticate, getChildren);

export default router;
