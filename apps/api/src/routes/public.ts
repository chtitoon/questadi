import { Router } from 'express';
import { z } from 'zod';
import { QuoteLinkService } from '../services/QuoteLinkService';

const removalSchema = z.object({ message: z.string().max(500).optional() });

export function publicRouter(quoteLinkService: QuoteLinkService): Router {
  const router = Router();

  router.get('/q/:token', async (req, res) => {
    const payload = await quoteLinkService.resolveToken(req.params.token);
    res.json(payload);
  });

  router.post('/q/:token/public', async (req, res) => {
    await quoteLinkService.acceptPublic(req.params.token);
    res.json({ isPublic: true });
  });

  router.post('/q/:token/removal', async (req, res) => {
    const { message } = removalSchema.parse(req.body);
    await quoteLinkService.requestRemoval(req.params.token, message);
    res.json({ requested: true });
  });

  router.get('/a/:accountId', async (req, res) => {
    const profile = await quoteLinkService.getPersonProfile(req.params.accountId);
    res.json(profile);
  });

  return router;
}
