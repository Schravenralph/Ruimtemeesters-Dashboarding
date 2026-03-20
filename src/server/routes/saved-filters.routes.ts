import { Router } from 'express';
import { listSavedFilters, createSavedFilter, deleteSavedFilter } from '../controllers/saved-filters.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, listSavedFilters);
router.post('/', authenticate, createSavedFilter);
router.delete('/:id', authenticate, deleteSavedFilter);

export default router;
