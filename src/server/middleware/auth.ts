import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual, createHmac } from 'crypto';
import { verifyToken as verifyClerkToken, createClerkClient } from '@clerk/express';
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
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';

// Deterministic UUID for the synthetic service account
const SERVICE_USER_ID = '00000000-0000-4000-8000-000000000001';

const clerk = CLERK_SECRET_KEY ? createClerkClient({ secretKey: CLERK_SECRET_KEY }) : null;

function safeCompare(a: string, b: string): boolean {
  const ha = createHmac('sha256', 'key-compare').update(a).digest();
  const hb = createHmac('sha256', 'key-compare').update(b).digest();
  return timingSafeEqual(ha, hb);
}

async function findOrCreateClerkUser(clerkUserId: string): Promise<Request['user']> {
  // Check if user already exists by clerk_id
  let result = await query(
    'SELECT id, email, name, role, organization_id, attributes FROM users WHERE clerk_id = $1',
    [clerkUserId],
  );

  if (result.rows.length > 0) {
    const row = result.rows[0];
    return { id: row.id, email: row.email, name: row.name, role: row.role, organizationId: row.organization_id, attributes: row.attributes || {} };
  }

  // Fetch user details from Clerk
  if (!clerk) throw new Error('CLERK_SECRET_KEY not configured');
  const clerkUser = await clerk.users.getUser(clerkUserId);
  const email = clerkUser.emailAddresses[0]?.emailAddress || '';
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || 'Gebruiker';
  const clerkRole = (clerkUser.publicMetadata?.role as string) || '';
  const role = (clerkRole === 'director' || clerkRole === 'manager') ? 'admin' : 'viewer';

  // Check if user exists by email (link existing account)
  result = await query(
    'SELECT id, email, name, role, organization_id, attributes FROM users WHERE email = $1',
    [email],
  );

  if (result.rows.length > 0) {
    // Link Clerk ID to existing user
    await query('UPDATE users SET clerk_id = $1 WHERE email = $2', [clerkUserId, email]);
    const row = result.rows[0];
    return { id: row.id, email: row.email, name: row.name, role: row.role, organizationId: row.organization_id, attributes: row.attributes || {} };
  }

  // Create new user
  result = await query(
    'INSERT INTO users (email, name, role, clerk_id, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name, role, organization_id, attributes',
    [email, name, role, clerkUserId, 'clerk-sso'],
  );
  const row = result.rows[0];
  return { id: row.id, email: row.email, name: row.name, role: row.role, organizationId: row.organization_id, attributes: row.attributes || {} };
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Service API key for internal chatbot/MCP access
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

  // Verify as Clerk JWT
  if (CLERK_SECRET_KEY) {
    verifyClerkToken(token, { secretKey: CLERK_SECRET_KEY })
      .then(decoded => findOrCreateClerkUser(decoded.sub))
      .then(user => {
        if (!user) {
          res.status(401).json({ error: 'User not found' });
          return;
        }
        req.user = user;
        next();
      })
      .catch(() => {
        res.status(401).json({ error: 'Invalid token' });
      });
  } else {
    res.status(500).json({ error: 'Authentication not configured' });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token || !CLERK_SECRET_KEY) {
    next();
    return;
  }

  verifyClerkToken(token, { secretKey: CLERK_SECRET_KEY })
    .then(decoded => findOrCreateClerkUser(decoded.sub))
    .then(user => {
      req.user = user || undefined;
      next();
    })
    .catch(() => next());
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
