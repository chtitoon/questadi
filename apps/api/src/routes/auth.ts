import { Hono } from 'hono';
import { AccountRepository } from '../repositories/AccountRepository';
import { OtpRepository } from '../repositories/OtpRepository';
import { AuthService } from '../services/AuthService';
import { createTwilioClient } from '../lib/twilio';
import type { HonoEnv } from '../types/env';

export const authRouter = new Hono<HonoEnv>();

authRouter.post('/request', async (c) => {
  const sql = c.get('sql');
  const authService = new AuthService(
    new AccountRepository(sql),
    new OtpRepository(sql),
    sql,
    c.env.JWT_SECRET,
    createTwilioClient({
      sid:    c.env.TWILIO_ACCOUNT_SID,
      token:  c.env.TWILIO_AUTH_TOKEN,
      phone:  c.env.TWILIO_PHONE_NUMBER,
      logSms: c.env.LOG_SMS === 'true',
    }),
  );
  const { phone } = await c.req.json<{ phone: string }>();
  await authService.requestOtp(phone);
  return c.json({ sent: true });
});

authRouter.post('/verify', async (c) => {
  const sql = c.get('sql');
  const authService = new AuthService(
    new AccountRepository(sql),
    new OtpRepository(sql),
    sql,
    c.env.JWT_SECRET,
    createTwilioClient({
      sid:    c.env.TWILIO_ACCOUNT_SID,
      token:  c.env.TWILIO_AUTH_TOKEN,
      phone:  c.env.TWILIO_PHONE_NUMBER,
      logSms: c.env.LOG_SMS === 'true',
    }),
  );
  const { phone, code } = await c.req.json<{ phone: string; code: string }>();
  const result = await authService.verifyOtp(phone, code);
  return c.json(result);
});
