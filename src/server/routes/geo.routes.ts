import { Router } from 'express';
import { listAreas, getArea, getChildren } from '../controllers/geo.controller.js';

const router = Router();

router.get('/', listAreas);
router.get('/:code', getArea);
router.get('/:code/children', getChildren);

export default router;
