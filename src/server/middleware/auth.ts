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
  // All three code paths (clerk_id hit, email-link, new user) share the
  // same default-org backfill: an org-less account anywhere in the system
  // breaks the theme picker and every ABAC-gated query. Org defaults to
  // Ruimtemeesters; configurable via DEFAULT_SIGNUP_ORG_SLUG for
  // multi-tenant deployments. If the slug doesn't resolve, the column
  // stays NULL and the user is still served — better an org-less user
  // than a 500 on auth.
  const defaultOrgSlug = process.env.DEFAULT_SIGNUP_ORG_SLUG || 'ruimtemeesters';

  // Check if user already exists by clerk_id (hot path — every login after
  // the first lands here). Reads only in the steady state. If the row's
  // organization_id is NULL (e.g. seeded before #166), do a one-shot
  // conditional UPDATE on the way through — subsequent logins take the
  // pure-SELECT path again. This avoids the MVCC tuple-churn and lock
  // contention from writing on every login (#167).
  let result = await query(
    'SELECT id, email, name, role, organization_id, attributes FROM users WHERE clerk_id = $1',
    [clerkUserId],
  );

  if (result.rows.length > 0) {
    let row = result.rows[0];
    if (row.organization_id == null) {
      // Conditional UPDATE — the WHERE clause makes it a no-op for any
      // concurrent login that already filled the slot.
      const repaired = await query(
        `UPDATE users
           SET organization_id = (SELECT id FROM organizations WHERE slug = $2)
         WHERE clerk_id = $1 AND organization_id IS NULL
         RETURNING id, email, name, role, organization_id, attributes`,
        [clerkUserId, defaultOrgSlug],
      );
      if (repaired.rows.length > 0) row = repaired.rows[0];
    }
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
    // Link Clerk ID to existing user. COALESCE preserves any explicit
    // assignment but backfills NULL with the default org so legacy users
    // (or users seeded without an org) don't stay locked out.
    const updated = await query(
      `UPDATE users
         SET clerk_id = $1,
             organization_id = COALESCE(organization_id, (SELECT id FROM organizations WHERE slug = $3))
       WHERE email = $2
       RETURNING id, email, name, role, organization_id, attributes`,
      [clerkUserId, email, defaultOrgSlug],
    );
    const row = updated.rows[0];
    return { id: row.id, email: row.email, name: row.name, role: row.role, organizationId: row.organization_id, attributes: row.attributes || {} };
  }

  // Create new user — assign the default organization so the signup flow
  // doesn't leave new accounts org-less.
  result = await query(
    `INSERT INTO users (email, name, role, clerk_id, password_hash, organization_id)
     VALUES ($1, $2, $3, $4, $5, (SELECT id FROM organizations WHERE slug = $6))
     RETURNING id, email, name, role, organization_id, attributes`,
    [email, name, role, clerkUserId, 'clerk-sso', defaultOrgSlug],
  );
  const row = result.rows[0];
  return { id: row.id, email: row.email, name: row.name, role: row.role, organizationId: row.organization_id, attributes: row.attributes || {} };
}

// Local dev bypass — gated behind an explicit env var, never on in production.
// Lets you exercise the API from `pnpm dev` without a real Clerk session.
// Set DEV_BYPASS_AUTH=1 in .env to activate. Pairs with the App.tsx /
// AuthContext.tsx client-side bypass.
const DEV_BYPASS_AUTH =
  process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS_AUTH === '1';

function devBypassUser(): NonNullable<Request['user']> {
  return {
    // Default to the seeded admin user so FK-references (projects.created_by,
    // dashboard_layouts.user_id, etc.) resolve cleanly. Override via
    // DEV_BYPASS_AUTH_USER_ID if you need a specific account.
    id: process.env.DEV_BYPASS_AUTH_USER_ID || '10000000-0000-0000-0000-000000000001',
    email: process.env.DEV_BYPASS_AUTH_EMAIL || 'admin@ruimtemeesters.nl',
    name: 'Dev User',
    role: 'admin',
    organizationId: process.env.DEV_BYPASS_AUTH_ORG_ID || '00000000-0000-0000-0000-000000000001',
    attributes: {},
  };
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // Dev bypass: short-circuit auth in non-prod with explicit opt-in.
  if (DEV_BYPASS_AUTH) {
    req.user = devBypassUser();
    next();
    return;
  }

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
