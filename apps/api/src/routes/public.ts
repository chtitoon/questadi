import { Hono } from 'hono';
import { z } from 'zod';
import { QuoteLinkService } from '../services/QuoteLinkService';

const removalSchema = z.object({ message: z.string().max(500).optional() });

export function publicRouter(quoteLinkService: QuoteLinkService): Hono {
  const router = new Hono();

  router.get('/q/:token', async (c) => {
    const payload = await quoteLinkService.resolveToken(c.req.param('token'));
    return c.json(payload);
  });

  router.post('/q/:token/public', async (c) => {
    await quoteLinkService.acceptPublic(c.req.param('token'));
    return c.json({ isPublic: true });
  });

  router.post('/q/:token/removal', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { message } = removalSchema.parse(body);
    await quoteLinkService.requestRemoval(c.req.param('token'), message);
    return c.json({ requested: true });
  });

  router.get('/a/:accountId', async (c) => {
    const profile = await quoteLinkService.getPersonProfile(c.req.param('accountId'));
    return c.json(profile);
  });

  return router;
}
