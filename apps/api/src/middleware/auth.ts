import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, JwtPayload } from '../types/index';
import type { HonoEnv } from '../types/env';

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  const header = c.req.header('authorization');
  if (!header?.startsWith('Bearer ')) throw new UnauthorizedError('Missing authorization header');
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, c.env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
    c.set('user', { accountId: payload.sub, phone: payload.phone });
    return next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
});
