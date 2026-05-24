import { Router } from 'express';
import { QuoteService } from '../services/QuoteService';
import type { CreateQuoteRequest, AttributedToInput } from '../types/index';

export function quotesRouter(quoteService: QuoteService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const body = req.body as CreateQuoteRequest;
const { quote, isDuplicate } = await quoteService.createQuote(req.user!.accountId, body);
    res.status(isDuplicate ? 200 : 201).json(quote);
  });

  router.get('/library', async (req, res) => {
    const library = await quoteService.getLibrary(req.user!.accountId);
    res.json(library);
  });

  router.patch('/:id/attribution', async (req, res) => {
    const { attributedTo } = req.body as { attributedTo: AttributedToInput };
    const quote = await quoteService.updateAttribution(req.params.id, req.user!.accountId, attributedTo);
    res.json(quote);
  });

  router.patch('/:id/restore', async (req, res) => {
    const quote = await quoteService.restore(req.params.id, req.user!.accountId);
    res.json(quote);
  });

  router.patch('/:id/text', (_req, res) => {
    res.status(405).json({ error: 'Quote text is immutable', code: 'METHOD_NOT_ALLOWED' });
  });

  router.delete('/:id', async (req, res) => {
    await quoteService.softDelete(req.params.id, req.user!.accountId);
    res.sendStatus(204);
  });

  return router;
}
