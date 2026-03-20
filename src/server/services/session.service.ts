import { query } from '../db/pool.js';
import crypto from 'crypto';

/**
 * Session management service.
 * Tracks active user sessions for security and analytics.
 */

export async function createSession(options: {
  userId: string;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}): Promise<string> {
  const tokenHash = crypto.createHash('sha256').update(options.token).digest('hex');

  const result = await query(
    `INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [options.userId, tokenHash, options.ipAddress || null, options.userAgent || null, options.expiresAt],
  );

  return result.rows[0].id;
}

export async function getActiveSessions(userId: string): Promise<{
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}[]> {
  const result = await query(
    `SELECT id, ip_address, user_agent, created_at, expires_at
     FROM user_sessions
     WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY created_at DESC`,
    [userId],
  );

  return result.rows.map(r => ({
    id: r.id,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
  }));
}

export async function revokeSession(sessionId: string, userId: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM user_sessions WHERE id = $1 AND user_id = $2 RETURNING id`,
    [sessionId, userId],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await query(
    `DELETE FROM user_sessions WHERE user_id = $1`,
    [userId],
  );
  return result.rowCount || 0;
}

export async function cleanupExpiredSessions(): Promise<number> {
  const result = await query(
    `DELETE FROM user_sessions WHERE expires_at < NOW()`,
  );
  return result.rowCount || 0;
}
