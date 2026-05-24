import 'dotenv/config';
import 'express-async-errors';
import express from 'express';
import path from 'node:path';
import * as OpenApiValidator from 'express-openapi-validator';
import { getPool } from './lib/db';
import { logger } from './lib/logger';
import { authMiddleware } from './middleware/auth';
import { errorMiddleware } from './middleware/error';
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

// Startup validation
const REQUIRED_ENV = [
  'DATABASE_URL', 'JWT_SECRET', 'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'WEB_HOST', 'API_BASE_URL',
];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  logger.error('Missing required environment variables', { missing });
  process.exit(1);
}
if ((process.env.JWT_SECRET?.length ?? 0) < 32) {
  logger.error('JWT_SECRET must be at least 32 characters');
  process.exit(1);
}

const pool = getPool();

// Repositories
const accountRepo  = new AccountRepository(pool);
const quoteRepo    = new QuoteRepository(pool);
const otpRepo      = new OtpRepository(pool);
const notifRepo    = new NotificationRepository(pool);
const quoteLinkRepo = new QuoteLinkRepository(pool);
const removalRepo  = new RemovalRequestRepository(pool);

// Services
const notifService      = new NotificationService(quoteRepo, accountRepo, notifRepo, quoteLinkRepo);
const authService       = new AuthService(accountRepo, otpRepo);
const quoteService      = new QuoteService(quoteRepo, accountRepo, notifService);
const quoteLinkService  = new QuoteLinkService(quoteLinkRepo, quoteRepo, accountRepo, removalRepo);
const accountService    = new AccountService(accountRepo);

// App
const app = express();
app.use(express.json());
app.use(
  OpenApiValidator.middleware({
    apiSpec: path.resolve(__dirname, '../../../packages/api/openapi.yaml'),
    validateRequests: true,
    validateResponses: false,
    ignorePaths: /^\/(q|a)\//,
  }),
);

app.use('/auth',     authRouter(authService, pool));
app.use('/quotes',   authMiddleware, quotesRouter(quoteService));
app.use('/accounts', authMiddleware, accountsRouter(accountService));
app.use('/',         publicRouter(quoteLinkService));

app.use(errorMiddleware);

const port = parseInt(process.env.PORT ?? '3000', 10);
app.listen(port, () => logger.info(`Questadi API listening on port ${port}`));
