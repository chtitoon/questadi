import { Hono } from 'hono';
import { z } from 'zod';
import { QuoteLinkService } from '../services/QuoteLinkService';

const removalSchema = z.object({ message: z.string().max(500).optional() });
const patchLinkSchema = z.object({ isPublic: z.literal(true) });

export function publicRouter(quoteLinkService: QuoteLinkService): Hono {
  const router = new Hono();

  router.get('/links/:token', async (c) => {
    const payload = await quoteLinkService.resolveToken(c.req.param('token'));
    return c.json(payload);
  });

  router.patch('/links/:token', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { isPublic } = patchLinkSchema.parse(body);
    if (isPublic) await quoteLinkService.acceptPublic(c.req.param('token'));
    return c.json({ isPublic: true });
  });

  router.delete('/links/:token', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const { message } = removalSchema.parse(body);
    await quoteLinkService.requestRemoval(c.req.param('token'), message);
    return new Response(null, { status: 204 });
  });

  router.get('/quotes', async (c) => {
    const author = c.req.query('author');
    if (!author) return c.json({ error: 'author query parameter is required', code: 'VALIDATION_ERROR' }, 400);
    const profile = await quoteLinkService.getPersonProfile(author);
    return c.json(profile);
  });

  return router;
}
