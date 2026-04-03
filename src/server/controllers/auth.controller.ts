import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { signToken } from '../auth/jwt.js';
import { LoginRequest } from '../../shared/api/contracts.js';

const RegisterRequest = LoginRequest.extend({
  name: z.string().min(1),
});

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = LoginRequest.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;

  const result = await query(
    'SELECT id, email, name, role, password_hash, organization_id, attributes FROM users WHERE email = $1',
    [email],
  );

  if (result.rows.length === 0) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({ id: user.id, email: user.email, role: user.role });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organization_id,
      attributes: user.attributes || {},
      createdAt: user.created_at,
    },
  });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  res.json({ user: req.user });
}

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = RegisterRequest.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { email, password, name } = parsed.data;

  // Check if user exists
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'viewer')
     RETURNING id, email, name, role, organization_id, attributes, created_at`,
    [email, passwordHash, name],
  );

  const user = result.rows[0];
  const token = signToken({ id: user.id, email: user.email, role: user.role });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organization_id,
      attributes: user.attributes || {},
      createdAt: user.created_at,
    },
  });
}
