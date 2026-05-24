import { Context } from 'hono';
import { AppError } from '../types/index';
import { logger } from '../lib/logger';

export function errorHandler(err: Error, c: Context): Response {
  if (err instanceof AppError) {
    return c.json({ error: err.message, code: err.code }, err.httpStatus as any);
  }
  logger.error('Unhandled error', { path: c.req.path, msg: err.message });
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500);
}
