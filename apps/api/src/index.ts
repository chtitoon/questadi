import 'dotenv/config';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { getPool } from './lib/db';
import { logger } from './lib/logger';
import { authMiddleware } from './middleware/auth';
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
import { quotesRouter } from './routes/quotes';
import { accountsRouter } from './routes/accounts';
import { publicRouter } from './routes/public';
import type { HonoVariables } from './types/index';

const REQUIRED_ENV = [
  'DATABASE_URL', 'JWT_SECRET', 'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'WEB_HOST', 'API_BASE_URL',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) { logger.error('Missing required environment variables', { missing }); process.exit(1); }
if ((process.env.JWT_SECRET?.length ?? 0) < 32) { logger.error('JWT_SECRET must be at least 32 characters'); process.exit(1); }

const pool = getPool();

const accountRepo   = new AccountRepository(pool);
const quoteRepo     = new QuoteRepository(pool);
const otpRepo       = new OtpRepository(pool);
const notifRepo     = new NotificationRepository(pool);
const quoteLinkRepo = new QuoteLinkRepository(pool);
const removalRepo   = new RemovalRequestRepository(pool);

const notifService     = new NotificationService(quoteRepo, accountRepo, notifRepo, quoteLinkRepo);
const authService      = new AuthService(accountRepo, otpRepo);
const quoteService     = new QuoteService(quoteRepo, accountRepo, notifService);
const quoteLinkService = new QuoteLinkService(quoteLinkRepo, quoteRepo, accountRepo, removalRepo);
const accountService   = new AccountService(accountRepo);

const app = new Hono<{ Variables: HonoVariables }>();

app.route('/auth',     authRouter(authService, pool));
app.use('/quotes/*',   authMiddleware);
app.use('/accounts/*', authMiddleware);
app.route('/quotes',   quotesRouter(quoteService));
app.route('/accounts', accountsRouter(accountService));
app.route('/',         publicRouter(quoteLinkService));

app.onError((err, c) => errorHandler(err, c));

const port = parseInt(process.env.PORT ?? '3000', 10);
serve({ fetch: app.fetch, port }, () =>
  logger.info(`Questadi API listening on port ${port}`),
);
