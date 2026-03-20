import type { Request, Response, NextFunction } from 'express';
import { evaluatePolicies } from './abac.js';

/**
 * Middleware that checks ABAC policies for data access.
 * Evaluates the resource pattern `data:{source}` against user policies.
 * If no user is authenticated, allows access (public data).
 */
export function checkDataAccess(req: Request, res: Response, next: NextFunction): void {
  const source = req.query.source as string;

  if (!source) {
    next();
    return;
  }

  // If no user (guest access), check if public access is allowed
  if (!req.user) {
    next();
    return;
  }

  evaluatePolicies(req.user, `data:${source}`)
    .then(allowed => {
      if (!allowed) {
        res.status(403).json({ error: 'Access denied to this data source' });
        return;
      }
      next();
    })
    .catch(() => {
      // On error, allow access (fail-open for data reads)
      next();
    });
}
