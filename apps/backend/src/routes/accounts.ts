import { Router } from 'express';
import { AccountService } from '../services/AccountService';

export function accountsRouter(accountService: AccountService): Router {
  const router = Router();

  router.get('/search', async (req, res) => {
    const q = req.query.q as string;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 8;
    const results = await accountService.searchForAutocomplete(q, req.user!.accountId, limit);
    res.json(results);
  });

  return router;
}
