import { Hono } from 'hono';
import { AuthService } from '../services/AuthService';

export function authRouter(authService: AuthService): Hono {
  const router = new Hono();

  router.post('/request', async (c) => {
    const { phone } = await c.req.json<{ phone: string }>();
    await authService.requestOtp(phone);
    return c.json({ sent: true });
  });

  router.post('/verify', async (c) => {
    const { phone, code } = await c.req.json<{ phone: string; code: string }>();
    const result = await authService.verifyOtp(phone, code);
    return c.json(result);
  });

  return router;
}
