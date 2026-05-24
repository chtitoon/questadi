import twilio from 'twilio';
import { logger } from './logger';

export interface TwilioClient {
  sendSms(to: string, body: string): Promise<void>;
  sendOtp(phone: string, code: string): Promise<void>;
}

export function createTwilioClient(config: {
  sid: string;
  token: string;
  phone: string;
  logSms: boolean;
}): TwilioClient {
  const client = config.logSms ? null : twilio(config.sid, config.token);

  return {
    async sendSms(to, body) {
      if (config.logSms) {
        logger.info('DEV SMS (not sent)', { to, body });
        return;
      }
      await client!.messages.create({ from: config.phone, to, body });
    },
    async sendOtp(phone, code) {
      await this.sendSms(phone, `Your Questadi code: ${code}. Expires in 10 minutes.`);
    },
  };
}
