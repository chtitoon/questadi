import { Hono } from 'hono';
import { AccountRepository } from '../repositories/AccountRepository';
import { QuoteRepository } from '../repositories/QuoteRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { QuoteLinkRepository } from '../repositories/QuoteLinkRepository';
import { AccountService } from '../services/AccountService';
import { QuoteService } from '../services/QuoteService';
import { NotificationService } from '../services/NotificationService';
import { createTwilioClient } from '../lib/twilio';
import type { CreateQuoteRequest } from '../types/index';
import type { HonoEnv } from '../types/env';

export const userRouter = new Hono<HonoEnv>();

userRouter.get('/captures', async (c) => {
  const sql = c.get('sql');
  const library = await new QuoteService(new QuoteRepository(sql), new AccountRepository(sql))
    .getLibrary(c.get('user').accountId);
  return c.json(library);
});

userRouter.post('/captures', async (c) => {
  const sql         = c.get('sql');
  const quoteRepo   = new QuoteRepository(sql);
  const accountRepo = new AccountRepository(sql);
  const notifService = new NotificationService(
    quoteRepo, accountRepo,
    new NotificationRepository(sql),
    new QuoteLinkRepository(sql),
    c.env.WEB_HOST,
    createTwilioClient({
      sid:    c.env.TWILIO_ACCOUNT_SID,
      token:  c.env.TWILIO_AUTH_TOKEN,
      phone:  c.env.TWILIO_PHONE_NUMBER,
      logSms: c.env.LOG_SMS === 'true',
    }),
  );
  const body = await c.req.json<CreateQuoteRequest>();
  const { quote, isDuplicate } = await new QuoteService(quoteRepo, accountRepo)
    .createQuote(c.get('user').accountId, body, notifService);
  return c.json(quote, isDuplicate ? 200 : 201);
});

userRouter.delete('/captures/:id', async (c) => {
  const sql = c.get('sql');
  await new QuoteService(new QuoteRepository(sql), new AccountRepository(sql))
    .softDelete(c.req.param('id'), c.get('user').accountId);
  return new Response(null, { status: 204 });
});

userRouter.get('/contacts', async (c) => {
  const sql     = c.get('sql');
  const q       = c.req.query('q') ?? '';
  const limit   = parseInt(c.req.query('limit') ?? '8', 10);
  const results = await new AccountService(new AccountRepository(sql))
    .searchForAutocomplete(q, c.get('user').accountId, limit);
  return c.json(results);
});
