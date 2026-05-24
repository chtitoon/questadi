import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/index';
import { logger } from '../lib/logger';

export function errorMiddleware(
  err: Error & { status?: number; errors?: unknown[] },
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({ error: err.message, code: err.code });
    return;
  }
  // express-openapi-validator validation errors
  if (err.status && err.status < 500) {
    res.status(err.status).json({ error: err.message, code: 'VALIDATION_ERROR' });
    return;
  }
  logger.error('Unhandled error', { path: req.path, msg: err.message });
  res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
}
