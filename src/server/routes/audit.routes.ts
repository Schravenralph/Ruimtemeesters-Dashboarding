import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getAuditLog } from '../services/audit.service.js';

const router = Router();

router.get('/', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const entries = await getAuditLog({
    userId: req.query.userId as string,
    action: req.query.action as string,
    limit: parseInt(req.query.limit as string) || 50,
    offset: parseInt(req.query.offset as string) || 0,
  });

  res.json({ entries });
});

export default router;
