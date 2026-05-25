import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import postgres from 'postgres';
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

// Per-request postgres instance. In CF Workers, connects to Hyperdrive's local
// proxy (sub-millisecond); Hyperdrive owns the real pool to Supabase. In Node.js
// dev, connects directly via DATABASE_URL.
app.use('*', async (c, next) => {
  const connStr = c.env.HYPERDRIVE?.connectionString ?? c.env.DATABASE_URL!;
  const sql = postgres(connStr, { max: 1, fetch_types: false });
  c.set('sql', sql);
  try {
    return await next();
  } finally {
    await sql.end();
  }
});

app.route('/otp', authRouter);
app.use('/user/*', authMiddleware);
app.route('/user', userRouter);
app.route('/', publicRouter);

app.onError((err, c) => errorHandler(err, c));

export default app;
