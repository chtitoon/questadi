import { Hono } from 'hono';
import { z } from 'zod';
import { QuoteLinkService } from '../services/QuoteLinkService';

const removalSchema = z.object({ message: z.string().max(500).optional() });
const patchLinkSchema = z.object({ isPublic: z.literal(true) });

export function publicRouter(quoteLinkService: QuoteLinkService): Hono {
  const router = new Hono();

  router.get('/tokens/:token', async (c) => {
    const payload = await quoteLinkService.resolveToken(c.req.param('token'));
    return c.json(payload);
  });

  router.patch('/tokens/:token', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { isPublic } = patchLinkSchema.parse(body);
    if (isPublic) await quoteLinkService.acceptPublic(c.req.param('token'));
    return c.json({ isPublic: true });
  });

  router.post('/tokens/:token/removal-requests', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { message } = removalSchema.parse(body);
    await quoteLinkService.requestRemoval(c.req.param('token'), message);
    return c.json({ requested: true }, 201);
  });

  router.get('/authors/:accountId/quotes', async (c) => {
    const profile = await quoteLinkService.getPersonProfile(c.req.param('accountId'));
    return c.json(profile);
  });

  return router;
}
