import type { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';
import type { PolicyCondition } from '../../shared/api/contracts.js';

interface PolicyRow {
  id: string;
  effect: 'allow' | 'deny';
  resource: string;
  conditions: PolicyCondition[];
  priority: number;
}

/**
 * Evaluate ABAC policies for a given resource action.
 * Policies are evaluated in priority order (highest first).
 * First matching policy determines access.
 * If no policy matches, access is denied by default.
 */
export async function evaluatePolicies(
  user: NonNullable<Request['user']>,
  resource: string,
): Promise<boolean> {
  const { rows: policies } = await query<PolicyRow>(
    `SELECT id, effect, resource, conditions, priority
     FROM access_policies
     ORDER BY priority DESC`,
  );

  // Find matching policies for this resource
  const matchingPolicies = policies.filter(p => matchesResource(p.resource, resource));

  for (const policy of matchingPolicies) {
    if (evaluateConditions(policy.conditions, user, resource)) {
      return policy.effect === 'allow';
    }
  }

  // Default: allow for admin, deny for others
  return user.role === 'admin';
}

function matchesResource(pattern: string, resource: string): boolean {
  if (pattern === '*') return true;
  if (pattern === resource) return true;

  // Wildcard matching: 'theme:*' matches 'theme:bevolking'
  const parts = pattern.split(':');
  const resourceParts = resource.split(':');

  if (parts.length !== resourceParts.length) return false;

  return parts.every((part, i) => part === '*' || part === resourceParts[i]);
}

function evaluateConditions(
  conditions: PolicyCondition[],
  user: NonNullable<Request['user']>,
  _resource: string,
): boolean {
  // All conditions must match (AND logic)
  return conditions.every(condition => evaluateCondition(condition, user));
}

function evaluateCondition(
  condition: PolicyCondition,
  user: NonNullable<Request['user']>,
): boolean {
  const fieldValue = resolveField(condition.field, user);
  const { operator, value } = condition;

  switch (operator) {
    case 'eq':
      return String(fieldValue) === String(value);
    case 'neq':
      return String(fieldValue) !== String(value);
    case 'in':
      return Array.isArray(value) && value.includes(String(fieldValue));
    case 'not_in':
      return Array.isArray(value) && !value.includes(String(fieldValue));
    case 'contains':
      return String(fieldValue).includes(String(value));
    case 'gte':
      return Number(fieldValue) >= Number(value);
    case 'lte':
      return Number(fieldValue) <= Number(value);
    default:
      return false;
  }
}

function resolveField(field: string, user: NonNullable<Request['user']>): unknown {
  const parts = field.split('.');
  if (parts[0] !== 'user') return undefined;

  let current: unknown = user;
  for (let i = 1; i < parts.length; i++) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[parts[i]];
  }
  return current;
}

/**
 * Express middleware that checks ABAC policies for a resource.
 */
export function requireAccess(resource: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const allowed = await evaluatePolicies(req.user, resource);
    if (!allowed) {
      res.status(403).json({ error: 'Access denied by policy' });
      return;
    }

    next();
  };
}
