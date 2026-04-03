import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['admin', 'editor', 'viewer', 'guest']).optional(),
  organizationId: z.string().nullable().optional(),
  attributes: z.record(z.string()).optional(),
});

export async function listUsers(_req: Request, res: Response): Promise<void> {
  const result = await query(
    `SELECT u.id, u.email, u.name, u.role, u.organization_id, u.attributes, u.created_at,
            o.name as organization_name
     FROM users u
     LEFT JOIN organizations o ON o.id = u.organization_id
     ORDER BY u.created_at DESC`,
  );

  res.json({
    users: result.rows.map(r => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      attributes: r.attributes || {},
      createdAt: r.created_at,
    })),
  });
}

export async function updateUser(req: Request, res: Response): Promise<void> {
  const parsed = UpdateUserSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { id } = req.params;
  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (parsed.data.name !== undefined) {
    updates.push(`name = $${idx++}`);
    params.push(parsed.data.name);
  }
  if (parsed.data.role !== undefined) {
    updates.push(`role = $${idx++}`);
    params.push(parsed.data.role);
  }
  if (parsed.data.organizationId !== undefined) {
    updates.push(`organization_id = $${idx++}`);
    params.push(parsed.data.organizationId);
  }
  if (parsed.data.attributes !== undefined) {
    updates.push(`attributes = $${idx++}`);
    params.push(JSON.stringify(parsed.data.attributes));
  }

  if (updates.length === 0) {
    res.status(400).json({ error: 'No updates provided' });
    return;
  }

  updates.push('updated_at = NOW()');
  params.push(id);

  const result = await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, email, name, role, organization_id, attributes`,
    params,
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json(result.rows[0]);
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  // Prevent self-deletion
  if (req.user?.id === id) {
    res.status(400).json({ error: 'Cannot delete your own account' });
    return;
  }

  const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(204).send();
}

const ResetPasswordSchema = z.object({
  password: z.string().min(8),
});

export async function resetUserPassword(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = ResetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const hash = await bcrypt.hash(parsed.data.password, 12);
  const result = await query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
    [hash, id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ success: true });
}

export async function listOrganizations(_req: Request, res: Response): Promise<void> {
  const result = await query('SELECT * FROM organizations ORDER BY name');
  res.json({ organizations: result.rows });
}
