import type { Request, Response, NextFunction } from 'express';
import { query } from '../db/pool.js';

/**
 * Middleware that scopes data access to the user's organization region.
 * If the user has a region attribute, restrict geo queries to that region.
 * Admins bypass this restriction.
 */
export function orgScope(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user || req.user.role === 'admin') {
    next();
    return;
  }

  const region = req.user.attributes?.region;
  if (!region || region === 'national') {
    next();
    return;
  }

  // Map region names to province codes
  const regionMap: Record<string, string> = {
    'noord-holland': 'NL-NH',
    'zuid-holland': 'NL-ZH',
    'utrecht': 'NL-UT',
    'noord-brabant': 'NL-NB',
    'gelderland': 'NL-GE',
    'overijssel': 'NL-OV',
    'limburg': 'NL-LI',
    'groningen': 'NL-GR',
    'friesland': 'NL-FR',
    'drenthe': 'NL-DR',
    'flevoland': 'NL-FL',
    'zeeland': 'NL-ZE',
  };

  const provinceCode = regionMap[region.toLowerCase()];
  if (provinceCode) {
    // Attach scoping info to request for controllers to use
    (req as Request & { orgScope?: { provinceCode: string; region: string } }).orgScope = {
      provinceCode,
      region,
    };
  }

  next();
}
