import { Hono } from 'hono';
import { Pool } from 'pg';
import { AuthService } from '../services/AuthService';

export function authRouter(authService: AuthService, pool: Pool): Hono {
  const router = new Hono();

  router.post('/otp/request', async (c) => {
    const { phone } = await c.req.json<{ phone: string }>();
    await authService.requestOtp(phone);
    return c.json({ sent: true });
  });

  router.post('/otp/verify', async (c) => {
    const { phone, code } = await c.req.json<{ phone: string; code: string }>();
    const result = await authService.verifyOtp(phone, code, pool);
    return c.json(result);
  });

  return router;
}
