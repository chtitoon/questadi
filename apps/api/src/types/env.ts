import type { Sql } from 'postgres';

export type Bindings = {
  HYPERDRIVE?: { connectionString: string };
  DATABASE_URL?: string;
  JWT_SECRET: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  WEB_HOST: string;
  LOG_SMS?: string;
  ALLOWED_ORIGIN?: string;
};

export type AppVariables = {
  user: { accountId: string; phone: string };
  sql: Sql;
};

export type HonoEnv = {
  Bindings: Bindings;
  Variables: AppVariables;
};
