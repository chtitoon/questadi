import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { Client } from 'pg';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';
import { authRouter } from './routes/auth';
import { userRouter } from './routes/user';
import { publicRouter } from './routes/public';
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
  const client = new Client({ connectionString });
  await client.connect();
  c.set('sql', client);
  try {
    await next();
  } finally {
    await client.end();
  }
});

app.route('/otp', authRouter);
app.use('/user/*', authMiddleware);
app.route('/user', userRouter);
app.route('/', publicRouter);

app.onError((err, c) => errorHandler(err, c));

export default app;
