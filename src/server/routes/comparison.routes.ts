import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { compareAreasAtLevel } from '../services/comparison.service.js';

const router: Router = Router();

router.get('/areas', authenticate, async (req: Request, res: Response) => {
  const source = (req.query.source as string) || 'bevolking';
  const level = (req.query.level as string) || 'gemeente';
  const currentYear = parseInt(req.query.currentYear as string) || 2024;
  const previousYear = parseInt(req.query.previousYear as string) || 2020;

  const results = await compareAreasAtLevel({ source, level, currentYear, previousYear });
  res.json(results);
});

export default router;
