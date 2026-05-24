import twilio from 'twilio';
import { logger } from './logger';

const DEV_SMS = process.env.LOG_SMS === 'true';

const client = DEV_SMS
  ? null
  : twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

export const twilioClient = {
  async sendSms(to: string, body: string): Promise<void> {
    if (DEV_SMS) {
      logger.info('DEV SMS (not sent)', { to, body });
      return;
    }
    await client!.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER!,
      to,
      body,
    });
  },

  async sendOtp(phone: string, code: string): Promise<void> {
    await this.sendSms(phone, `Your Questadi code: ${code}. Expires in 10 minutes.`);
  },
};
