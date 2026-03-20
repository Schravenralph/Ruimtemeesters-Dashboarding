import type { Request, Response } from 'express';
import { query } from '../db/pool.js';
import crypto from 'crypto';
import { z } from 'zod';

const CreateKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string()).default(['read']),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

/**
 * Generate a new API key.
 * Returns the full key ONCE — it's never stored or retrievable again.
 */
export async function createApiKey(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

  const parsed = CreateKeySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { name, scopes, expiresInDays } = parsed.data;

  // Generate random key
  const rawKey = `rm_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.substring(0, 7);

  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    : null;

  const result = await query(
    `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, scopes, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, created_at`,
    [req.user.id, name, keyHash, keyPrefix, scopes, expiresAt],
  );

  // Return the full key ONCE
  res.status(201).json({
    id: result.rows[0].id,
    name,
    key: rawKey, // Only shown once!
    prefix: keyPrefix,
    scopes,
    expiresAt,
    createdAt: result.rows[0].created_at,
    warning: 'Bewaar deze sleutel veilig. Hij wordt niet opnieuw getoond.',
  });
}

export async function listApiKeys(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

  const result = await query(
    `SELECT id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_at
     FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id],
  );

  res.json({
    keys: result.rows.map(r => ({
      id: r.id,
      name: r.name,
      prefix: r.key_prefix,
      scopes: r.scopes,
      isActive: r.is_active,
      lastUsedAt: r.last_used_at,
      expiresAt: r.expires_at,
      createdAt: r.created_at,
    })),
  });
}

export async function revokeApiKey(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Authentication required' }); return; }

  const result = await query(
    `UPDATE api_keys SET is_active = false WHERE id = $1 AND user_id = $2 RETURNING id`,
    [req.params.id, req.user.id],
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'API key not found' });
    return;
  }

  res.json({ success: true, message: 'API sleutel ingetrokken' });
}
