import 'dotenv/config';
import { serve } from '@hono/node-server';
import { logger } from './lib/logger';
import { createApp } from './app';

const REQUIRED_ENV = [
  'DATABASE_URL', 'JWT_SECRET', 'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'WEB_HOST',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) { logger.error('Missing required environment variables', { missing }); process.exit(1); }
const jwtSecret = process.env.JWT_SECRET!;
if (jwtSecret.length < 32) { logger.error('JWT_SECRET must be at least 32 characters'); process.exit(1); }
if (new Set(jwtSecret).size < 8) { logger.error('JWT_SECRET has insufficient entropy'); process.exit(1); }

const app = createApp({
  databaseUrl:    process.env.DATABASE_URL!,
  jwtSecret,
  twilioSid:      process.env.TWILIO_ACCOUNT_SID!,
  twilioToken:    process.env.TWILIO_AUTH_TOKEN!,
  twilioPhone:    process.env.TWILIO_PHONE_NUMBER!,
  webHost:        process.env.WEB_HOST!,
  logSms:         process.env.LOG_SMS === 'true',
  allowedOrigin:  process.env.ALLOWED_ORIGIN ?? `https://${process.env.WEB_HOST}`,
});

const port = parseInt(process.env.PORT ?? '3000', 10);
serve({ fetch: app.fetch, port }, () =>
  logger.info(`Questadi API listening on port ${port}`),
);
