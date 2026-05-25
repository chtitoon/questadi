import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { Client } from 'pg';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { publicRouter } from './routes/public';
import { logger } from './lib/logger';
import type { HonoEnv } from './types/env';

const app = new Hono<HonoEnv>();

app.use('*', secureHeaders());

app.use('*', async (c, next) => {
  const origin = c.env.ALLOWED_ORIGIN ?? `https://${c.env.WEB_HOST}`;
  return cors({ origin })(c, next);
});

// Per-request pg Client. In CF Workers, connects to Hyperdrive's local
// proxy (sub-millisecond); Hyperdrive owns the real pool to Supabase. In Node.js
// dev, connects directly via DATABASE_URL.
app.use('*', async (c, next) => {
  const connectionString = c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL!;
  const client = new Client({ connectionString, connectionTimeoutMillis: 5000 });

  const t0 = performance.now();
  await client.connect();
  const connectMs = Math.round(performance.now() - t0);

  await client.query('SET statement_timeout = 10000');
  const readyMs = Math.round(performance.now() - t0);

  logger.info('db.connect', { connectMs, readyMs, via: c.env.HYPERDRIVE ? 'hyperdrive' : 'direct' });

  c.set('sql', client);
  try {
    await next();
  } finally {
    const endPromise = client.end().catch(() => {});
    try { c.executionCtx.waitUntil(endPromise); } catch { /* no ExecutionContext (e.g. local dev) */ }
  }
});

app.route('/otp', authRouter);
app.use('/user/*', authMiddleware);
app.route('/user', userRouter);
app.route('/', publicRouter);

app.notFound((c) => c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404));
app.onError((err, c) => errorHandler(err, c));

export default app;
