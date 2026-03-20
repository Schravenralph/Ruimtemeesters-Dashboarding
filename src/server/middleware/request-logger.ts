import type { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;

    const level = statusCode >= 500 ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';

    console.log(
      `[${level}] ${method} ${originalUrl} ${statusCode} ${duration}ms` +
      (req.user ? ` user=${req.user.email}` : ''),
    );
  });

  next();
}
