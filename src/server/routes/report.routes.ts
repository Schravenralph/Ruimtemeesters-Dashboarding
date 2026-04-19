import { Router, type Router as RouterType } from 'express';
import type { Request, Response } from 'express';
import { generateReport } from '../services/report.service.js';
import { authenticate } from '../middleware/auth.js';
import { checkDataAccess } from '../middleware/abac-data.js';
import { csvEscape } from '../utils/csv.js';

const router: RouterType = Router();

router.get('/:source/csv', authenticate, checkDataAccess, async (req: Request, res: Response) => {
  const source = req.params.source as string;
  const geoCode = (req.query.geoCode as string) || 'NL';
  const year = parseInt(req.query.year as string) || 2024;
  const compareYear = req.query.compareYear ? parseInt(req.query.compareYear as string) : undefined;

  try {
    const report = await generateReport({ source, geoCode, year, includeComparison: !!compareYear, compareYear });
    const header = ['section', 'label', 'value', 'unit', 'change'];
    const rows = [header.join(',')];
    for (const section of report.sections) {
      for (const item of section.data) {
        rows.push([
          csvEscape(section.title),
          csvEscape(item.label),
          csvEscape(item.value),
          csvEscape(report.unit ?? ''),
          csvEscape(item.change ?? ''),
        ].join(','));
      }
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="rapport-${source}-${geoCode}-${year}.csv"`);
    res.send(rows.join('\n'));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Report generation failed' });
  }
});

router.get('/:source', authenticate, checkDataAccess, async (req: Request, res: Response) => {
  const source = req.params.source as string;
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
