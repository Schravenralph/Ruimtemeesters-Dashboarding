import type { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import { evaluatePolicies } from './abac.js';

/**
 * Resolve a data source key to the theme slugs that use it (via tiles).
 * Cached for 60 seconds to avoid repeated lookups.
 */
let sourceThemeCache: Map<string, string[]> | null = null;
let sourceCacheExpiry = 0;

async function getThemeSlugsForSource(source: string): Promise<string[]> {
  const now = Date.now();
  if (!sourceThemeCache || now > sourceCacheExpiry) {
    const result = await query(
      `SELECT DISTINCT ti.data_source, t.slug
       FROM tiles ti
       JOIN themes t ON ti.theme_id = t.id`,
    );
    const map = new Map<string, string[]>();
    for (const row of result.rows) {
      const existing = map.get(row.data_source) || [];
      existing.push(row.slug);
      map.set(row.data_source, existing);
    }
    sourceThemeCache = map;
    sourceCacheExpiry = now + 60_000;
  }
  return sourceThemeCache.get(source) || [];
}

/**
 * Middleware that checks ABAC policies for data access.
 * Resolves the data source to its parent theme(s) and checks theme policies.
 * Denies unauthenticated access and fails closed on errors.
 */
export function checkDataAccess(req: Request, res: Response, next: NextFunction): void {
  // Prefer params.source (path parameter) over query.source to prevent
  // ABAC bypass via ?source=allowed on /api/trends/restricted
  const source = (req.params.source as string) || (req.query.source as string);

  if (!source) {
    next();
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Admins bypass source-level checks
  if (req.user.role === 'admin') {
    next();
    return;
  }

  getThemeSlugsForSource(source)
    .then(async (themeSlugs) => {
      // If no theme uses this source, deny non-admin access
      if (themeSlugs.length === 0) {
        res.status(403).json({ error: 'Access denied to this data source' });
        return;
      }

      // Allow if user has access to any theme that uses this source
      for (const slug of themeSlugs) {
        const allowed = await evaluatePolicies(req.user!, `theme:${slug}`);
        if (allowed) {
          next();
          return;
        }
      }

      res.status(403).json({ error: 'Access denied to this data source' });
    })
    .catch(() => {
      res.status(500).json({ error: 'Policy evaluation failed' });
    });
}
