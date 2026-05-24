import { Hono } from 'hono';
import { QuoteService } from '../services/QuoteService';
import type { CreateQuoteRequest, AttributedToInput, HonoVariables } from '../types/index';

export function quotesRouter(quoteService: QuoteService): Hono<{ Variables: HonoVariables }> {
  const router = new Hono<{ Variables: HonoVariables }>();

  router.post('/', async (c) => {
    const body = await c.req.json<CreateQuoteRequest>();
    const user = c.get('user');
    const { quote, isDuplicate } = await quoteService.createQuote(user.accountId, body);
    return c.json(quote, isDuplicate ? 200 : 201);
  });

  router.get('/library', async (c) => {
    const user = c.get('user');
    const library = await quoteService.getLibrary(user.accountId);
    return c.json(library);
  });

  router.patch('/:id/attribution', async (c) => {
    const { attributedTo } = await c.req.json<{ attributedTo: AttributedToInput }>();
    const user = c.get('user');
    const quote = await quoteService.updateAttribution(c.req.param('id'), user.accountId, attributedTo);
    return c.json(quote);
  });

  router.patch('/:id/restore', async (c) => {
    const user = c.get('user');
    const quote = await quoteService.restore(c.req.param('id'), user.accountId);
    return c.json(quote);
  });

  router.patch('/:id/text', (c) => {
    return c.json({ error: 'Quote text is immutable', code: 'METHOD_NOT_ALLOWED' }, 405);
  });

  router.delete('/:id', async (c) => {
    const user = c.get('user');
    await quoteService.softDelete(c.req.param('id'), user.accountId);
    return new Response(null, { status: 204 });
  });

  return router;
}
