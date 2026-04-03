import { Router } from 'express';
import type { Request, Response } from 'express';
import { generateReport } from '../services/report.service.js';
import { authenticate } from '../middleware/auth.js';
import { checkDataAccess } from '../middleware/abac-data.js';

const router = Router();

router.get('/:source', authenticate, checkDataAccess, async (req: Request, res: Response) => {
  const { source } = req.params;
  const geoCode = (req.query.geoCode as string) || 'NL';
  const year = parseInt(req.query.year as string) || 2024;
  const compareYear = req.query.compareYear ? parseInt(req.query.compareYear as string) : undefined;

  try {
    const report = await generateReport({
      source,
      geoCode,
      year,
      includeComparison: !!compareYear,
      compareYear,
    });

    res.json(report);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Report generation failed' });
  }
});

export default router;
