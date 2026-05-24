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
}

let app: ReturnType<typeof createApp> | null = null;

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    if (!app) {
      const config: AppConfig = {
        databaseUrl:  env.HYPERDRIVE.connectionString,
        jwtSecret:    env.JWT_SECRET,
        twilioSid:    env.TWILIO_ACCOUNT_SID,
        twilioToken:  env.TWILIO_AUTH_TOKEN,
        twilioPhone:  env.TWILIO_PHONE_NUMBER,
        webHost:      env.WEB_HOST,
        logSms:       env.LOG_SMS === 'true',
      };
      app = createApp(config);
    }
    return app.fetch(request);
  },
};
