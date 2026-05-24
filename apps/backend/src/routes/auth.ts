import { Router } from 'express';
import { Pool } from 'pg';
import { AuthService } from '../services/AuthService';

export function authRouter(authService: AuthService, pool: Pool): Router {
  const router = Router();

  router.post('/otp/request', async (req, res) => {
    const { phone } = req.body as { phone: string };
    await authService.requestOtp(phone);
    res.json({ sent: true });
  });

  router.post('/otp/verify', async (req, res) => {
    const { phone, code } = req.body as { phone: string; code: string };
    const result = await authService.verifyOtp(phone, code, pool);
    res.json(result);
  });

  return router;
}
