import type { Request, Response, NextFunction } from 'express';

/**
 * API versioning middleware.
 * Sets version headers and supports Accept-Version header for future versioning.
 */
export function apiVersion(req: Request, res: Response, next: NextFunction): void {
  // Set current API version header
  res.setHeader('X-API-Version', '1.0');

  // Check if client requested a specific version
  const requestedVersion = req.headers['accept-version'] as string | undefined;
  if (requestedVersion && requestedVersion !== '1.0' && requestedVersion !== '1') {
    res.status(400).json({
      error: `API version ${requestedVersion} is not supported. Current version: 1.0`,
    });
    return;
  }

  next();
}
