import { Hono } from 'hono';
import { z } from 'zod';
import { AccountRepository } from '../repositories/AccountRepository';
import { QuoteRepository } from '../repositories/QuoteRepository';
import { QuoteLinkRepository } from '../repositories/QuoteLinkRepository';
import { RemovalRequestRepository } from '../repositories/RemovalRequestRepository';
import { QuoteLinkService } from '../services/QuoteLinkService';
import type { HonoEnv } from '../types/env';

const removalSchema = z.object({ message: z.string().max(500).optional() });
const patchLinkSchema = z.object({ isPublic: z.literal(true) });

export const publicRouter = new Hono<HonoEnv>();

publicRouter.get('/links/:token', async (c) => {
  const sql = c.get('sql');
  const payload = await new QuoteLinkService(
    new QuoteLinkRepository(sql),
    new QuoteRepository(sql),
    new AccountRepository(sql),
    new RemovalRequestRepository(sql),
  ).resolveToken(c.req.param('token'));
  return c.json(payload);
});

publicRouter.patch('/links/:token', async (c) => {
  const sql = c.get('sql');
  const body = await c.req.json().catch(() => ({}));
  const { isPublic } = patchLinkSchema.parse(body);
  if (isPublic) {
    await new QuoteLinkService(
      new QuoteLinkRepository(sql),
      new QuoteRepository(sql),
      new AccountRepository(sql),
      new RemovalRequestRepository(sql),
    ).acceptPublic(c.req.param('token'));
  }
  return c.json({ isPublic: true });
});

publicRouter.delete('/links/:token', async (c) => {
  const sql = c.get('sql');
  const body = await c.req.json().catch(() => ({}));
  const { message } = removalSchema.parse(body);
  await new QuoteLinkService(
    new QuoteLinkRepository(sql),
    new QuoteRepository(sql),
    new AccountRepository(sql),
    new RemovalRequestRepository(sql),
  ).requestRemoval(c.req.param('token'), message);
  return new Response(null, { status: 204 });
});

publicRouter.get('/quotes', async (c) => {
  const author = c.req.query('author');
  if (!author) return c.json({ error: 'author query parameter is required', code: 'VALIDATION_ERROR' }, 400);
  const sql = c.get('sql');
  const profile = await new QuoteLinkService(
    new QuoteLinkRepository(sql),
    new QuoteRepository(sql),
    new AccountRepository(sql),
    new RemovalRequestRepository(sql),
  ).getPersonProfile(author);
  return c.json(profile);
});
