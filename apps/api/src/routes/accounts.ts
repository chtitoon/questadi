import { Hono } from 'hono';
import { AccountService } from '../services/AccountService';
import type { HonoVariables } from '../types/index';

export function accountsRouter(accountService: AccountService): Hono<{ Variables: HonoVariables }> {
  const router = new Hono<{ Variables: HonoVariables }>();

  router.get('/search', async (c) => {
    const q = c.req.query('q') ?? '';
    const limit = parseInt(c.req.query('limit') ?? '8', 10);
    const user = c.get('user');
    const results = await accountService.searchForAutocomplete(q, user.accountId, limit);
    return c.json(results);
  });

  return router;
}
