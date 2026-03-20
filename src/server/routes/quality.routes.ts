import { Router } from 'express';
import type { Request, Response } from 'express';
import { getDataQuality, getAllDataQuality } from '../services/data-quality.service.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  const metrics = await getAllDataQuality();
  res.json({ metrics });
});

router.get('/:source', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const metric = await getDataQuality(req.params.source);
  if (!metric) {
    res.status(404).json({ error: 'Unknown data source' });
    return;
  }
  res.json(metric);
});

export default router;
