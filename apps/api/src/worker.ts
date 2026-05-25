import { Pool } from 'pg';
import { createApp } from './app';
import type { AppConfig } from './app';

interface Env {
  HYPERDRIVE: { connectionString: string };
  JWT_SECRET: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  WEB_HOST: string;
  LOG_SMS?: string;
  ALLOWED_ORIGIN?: string;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

let config: ReturnType<typeof buildConfig> | null = null;

function buildConfig(env: Env) {
  return {
    jwtSecret:     env.JWT_SECRET,
    twilioSid:     env.TWILIO_ACCOUNT_SID,
    twilioToken:   env.TWILIO_AUTH_TOKEN,
    twilioPhone:   env.TWILIO_PHONE_NUMBER,
    webHost:       env.WEB_HOST,
    logSms:        env.LOG_SMS === 'true',
    allowedOrigin: env.ALLOWED_ORIGIN ?? `https://${env.WEB_HOST}`,
  };
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Response | Promise<Response> {
    if (!config) config = buildConfig(env);

    // Pool is created per-request with max:1 so Hyperdrive can cleanly reuse its
    // backend connection. ctx.waitUntil(pool.end()) signals a proper close after
    // the response is sent, preventing connections from accumulating on Supabase.
    const pool = new Pool({
      connectionString:        env.HYPERDRIVE.connectionString,
      max:                     1,
      connectionTimeoutMillis: 5000,
      query_timeout:           8000,
      statement_timeout:       8000,
    });
    ctx.waitUntil(pool.end());

    return createApp(config, pool).fetch(request);
  },
};
