import { Hono } from 'hono';
import { QuoteService } from '../services/QuoteService';
import { AccountService } from '../services/AccountService';
import type { CreateQuoteRequest, HonoVariables } from '../types/index';

export function userRouter(quoteService: QuoteService, accountService: AccountService): Hono<{ Variables: HonoVariables }> {
  const router = new Hono<{ Variables: HonoVariables }>();

  router.get('/captures', async (c) => {
    const user = c.get('user');
    const library = await quoteService.getLibrary(user.accountId);
    return c.json(library);
  });

  router.post('/captures', async (c) => {
    const body = await c.req.json<CreateQuoteRequest>();
    const user = c.get('user');
    const { quote, isDuplicate } = await quoteService.createQuote(user.accountId, body);
    return c.json(quote, isDuplicate ? 200 : 201);
  });

  router.delete('/captures/:id', async (c) => {
    const user = c.get('user');
    await quoteService.softDelete(c.req.param('id'), user.accountId);
    return new Response(null, { status: 204 });
  });

  router.get('/contacts', async (c) => {
    const q = c.req.query('q') ?? '';
    const limit = parseInt(c.req.query('limit') ?? '8', 10);
    const user = c.get('user');
    const results = await accountService.searchForAutocomplete(q, user.accountId, limit);
    return c.json(results);
  });

  return router;
}
