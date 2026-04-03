import { Router, type Router as RouterType } from 'express';
import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { z } from 'zod';
import { PolicyCondition } from '../../shared/api/contracts.js';

const router: RouterType = Router();

const CreatePolicySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  effect: z.enum(['allow', 'deny']),
  resource: z.string().min(1),
  conditions: z.array(PolicyCondition),
  priority: z.number().default(0),
});

// List policies (admin only)
router.get('/', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  const result = await query('SELECT * FROM access_policies ORDER BY priority DESC');
  res.json({ policies: result.rows });
});

// Create policy (admin only)
router.post('/', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const parsed = CreatePolicySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { name, description, effect, resource, conditions, priority } = parsed.data;

  const result = await query(
    `INSERT INTO access_policies (name, description, effect, resource, conditions, priority)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [name, description || null, effect, resource, JSON.stringify(conditions), priority],
  );

  res.status(201).json(result.rows[0]);
});

// Update policy (admin only)
router.put('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const parsed = CreatePolicySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) {
      updates.push(`${key} = $${idx++}`);
      params.push(key === 'conditions' ? JSON.stringify(value) : value);
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No updates provided' });
    return;
  }

  params.push(req.params.id);
  const result = await query(
    `UPDATE access_policies SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
    params,
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Policy not found' });
    return;
  }

  res.json(result.rows[0]);
});

// Delete policy (admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req: Request, res: Response) => {
  const result = await query('DELETE FROM access_policies WHERE id = $1 RETURNING id', [req.params.id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Policy not found' });
    return;
  }
  res.status(204).send();
});

export default router;
