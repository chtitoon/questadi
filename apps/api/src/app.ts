import { Hono, type Context } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { rateLimiter } from 'hono-rate-limiter';
import { Pool } from 'pg';
import { createTwilioClient } from './lib/twilio';
import { createAuthMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { AccountRepository } from './repositories/AccountRepository';
import { NotificationRepository } from './repositories/NotificationRepository';
import { OtpRepository } from './repositories/OtpRepository';
import { QuoteRepository } from './repositories/QuoteRepository';
import { RemovalRequestRepository } from './repositories/RemovalRequestRepository';
import { QuoteLinkRepository } from './repositories/QuoteLinkRepository';
import { AccountService } from './services/AccountService';
import { AuthService } from './services/AuthService';
import { NotificationService } from './services/NotificationService';
import { QuoteService } from './services/QuoteService';
import { QuoteLinkService } from './services/QuoteLinkService';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { publicRouter } from './routes/public';
import type { HonoVariables } from './types/index';

export interface AppConfig {
  databaseUrl: string;
  jwtSecret: string;
  twilioSid: string;
  twilioToken: string;
  twilioPhone: string;
  webHost: string;
  logSms: boolean;
  allowedOrigin: string;
}

export function createApp(config: AppConfig): Hono<{ Variables: HonoVariables }> {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const twilio = createTwilioClient({
    sid: config.twilioSid,
    token: config.twilioToken,
    phone: config.twilioPhone,
    logSms: config.logSms,
  });

  const accountRepo   = new AccountRepository(pool);
  const quoteRepo     = new QuoteRepository(pool);
  const otpRepo       = new OtpRepository(pool);
  const notifRepo     = new NotificationRepository(pool);
  const quoteLinkRepo = new QuoteLinkRepository(pool);
  const removalRepo   = new RemovalRequestRepository(pool);

  const notifService     = new NotificationService(quoteRepo, accountRepo, notifRepo, quoteLinkRepo, config.webHost, twilio);
  const authService      = new AuthService(accountRepo, otpRepo, pool, config.jwtSecret, twilio);
  const quoteService     = new QuoteService(quoteRepo, accountRepo, notifService);
  const quoteLinkService = new QuoteLinkService(quoteLinkRepo, quoteRepo, accountRepo, removalRepo);
  const accountService   = new AccountService(accountRepo);

  const authMiddleware = createAuthMiddleware(config.jwtSecret);

  const clientIp = (c: Context) =>
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
    c.req.header('x-real-ip') ??
    'unknown';

  const otpVerifyLimiter = rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-6',
    keyGenerator: clientIp,
  });

  const publicTokenLimiter = rateLimiter({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-6',
    keyGenerator: clientIp,
  });

  const app = new Hono<{ Variables: HonoVariables }>();

  app.use('*', secureHeaders());
  app.use('*', cors({ origin: config.allowedOrigin }));

  app.use('/auth/otp/verify', otpVerifyLimiter);
  app.route('/auth',   authRouter(authService));
  app.use('/tokens/*', publicTokenLimiter);
  app.use('/user/*',   authMiddleware);
  app.route('/user',   userRouter(quoteService, accountService));
  app.route('/',       publicRouter(quoteLinkService));

  app.onError((err, c) => errorHandler(err, c));

  return app;
}
