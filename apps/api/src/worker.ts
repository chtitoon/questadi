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


let app: ReturnType<typeof createApp> | null = null;

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    if (!app) {
      // Pool and app are cached for the isolate's lifetime. No idleTimeoutMillis
      // so connections stay alive between requests and Hyperdrive can reuse them.
      const pool = new Pool({
        connectionString:        env.HYPERDRIVE.connectionString,
        connectionTimeoutMillis: 5000,
        query_timeout:           8000,
      });
      app = createApp({
        jwtSecret:     env.JWT_SECRET,
        twilioSid:     env.TWILIO_ACCOUNT_SID,
        twilioToken:   env.TWILIO_AUTH_TOKEN,
        twilioPhone:   env.TWILIO_PHONE_NUMBER,
        webHost:       env.WEB_HOST,
        logSms:        env.LOG_SMS === 'true',
        allowedOrigin: env.ALLOWED_ORIGIN ?? `https://${env.WEB_HOST}`,
      }, pool);
    }
    return app.fetch(request);
  },
};
