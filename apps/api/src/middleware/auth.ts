import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, JwtPayload } from '../types/index';

export function createAuthMiddleware(jwtSecret: string) {
  return createMiddleware(async (c, next) => {
    const header = c.req.header('authorization');
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Missing authorization header');
    const token = header.slice(7);
    try {
      const payload = jwt.verify(token, jwtSecret) as JwtPayload;
      c.set('user', { accountId: payload.sub, phone: payload.phone });
      await next();
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  });
}
