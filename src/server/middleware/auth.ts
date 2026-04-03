import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHmac } from 'crypto';
import { verifyToken, type JwtPayload } from '../auth/jwt.js';
import { query } from '../db/pool.js';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
        organizationId: string | null;
        attributes: Record<string, string>;
      };
    }
  }
}

const SERVICE_API_KEY = process.env.SERVICE_API_KEY || '';

// Deterministic UUID for the synthetic service account (UUID v5 equivalent using SHA-256)
const SERVICE_USER_ID = '00000000-0000-4000-8000-000000000001';

function safeCompare(a: string, b: string): boolean {
  // Hash both to fixed length so comparison doesn't leak input lengths
  const ha = createHmac('sha256', 'key-compare').update(a).digest();
  const hb = createHmac('sha256', 'key-compare').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Service API key for internal chatbot/MCP access.
  // When x-user-email is provided, load that user so the chatbot operates
  // with the requesting user's actual role (intersection model).
  const apiKey = req.headers['x-api-key'] as string | undefined;
  if (SERVICE_API_KEY && apiKey && safeCompare(apiKey, SERVICE_API_KEY)) {
    const onBehalfOf = req.headers['x-user-email'] as string | undefined;
    if (onBehalfOf) {
      query('SELECT id, email, name, role, organization_id, attributes FROM users WHERE email = $1', [onBehalfOf])
        .then(result => {
          if (result.rows.length === 0) {
            res.status(401).json({ error: 'User not found for service request' });
            return;
          }
          const row = result.rows[0];
          req.user = { id: row.id, email: row.email, name: row.name, role: row.role, organizationId: row.organization_id, attributes: row.attributes || {} };
          next();
        })
        .catch(() => {
          res.status(500).json({ error: 'Internal server error' });
        });
    } else {
      // No user context — grant read-only viewer access
      req.user = { id: SERVICE_USER_ID, email: 'chatbot@ruimtemeesters.nl', name: 'Ruimtemeesters AI', role: 'viewer', organizationId: null, attributes: {} };
      next();
    }
    return;
  }

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = verifyToken(token);
    // Load full user from DB on each request for fresh attributes
    loadUser(payload).then(user => {
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      req.user = user;
      next();
    }).catch(() => {
      res.status(500).json({ error: 'Internal server error' });
    });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    loadUser(payload).then(user => {
      req.user = user || undefined;
      next();
    }).catch(() => next());
  } catch {
    next();
  }
}

async function loadUser(payload: JwtPayload) {
  const result = await query(
    'SELECT id, email, name, role, organization_id, attributes FROM users WHERE id = $1',
    [payload.userId],
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    organizationId: row.organization_id,
    attributes: row.attributes || {},
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
