import crypto from 'node:crypto';
import { AccountRepository } from '../repositories/AccountRepository';
import { NotificationRepository } from '../repositories/NotificationRepository';
import { QuoteRepository } from '../repositories/QuoteRepository';
import { QuoteLinkRepository } from '../repositories/QuoteLinkRepository';
import { twilioClient } from '../lib/twilio';
import { logger } from '../lib/logger';

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

export function buildSmsBody(
  capturerFirstName: string,
  quoteText: string,
  token: string,
): string {
  return (
    `${capturerFirstName} just captured something you said.\n\n` +
    `"${quoteText}"\n\n` +
    `See your legend: https://${process.env.WEB_HOST}/q/${token}`
  );
}

export class NotificationService {
  constructor(
    private quoteRepo: QuoteRepository,
    private accountRepo: AccountRepository,
    private notifRepo: NotificationRepository,
    private quoteLinkRepo: QuoteLinkRepository,
  ) {}

  dispatchAsync(quoteId: string): void {
    (async () => {
      let notificationId: string | undefined;
      try {
        const quote = await this.quoteRepo.findById(quoteId);
        if (!quote || !quote.attributed_to) return;

        const recipient = await this.accountRepo.findById(quote.attributed_to);
        if (!recipient?.phone) return;

        const recentCount = await this.notifRepo.countRecent(recipient.id, hoursAgo(24));
        if (recentCount >= 3) return;

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const notification = await this.notifRepo.create({
          quote_id: quoteId,
          recipient: recipient.id,
        });
        notificationId = notification.id;

        await this.quoteLinkRepo.create({
          notification_id: notification.id,
          token,
          expires_at: expiresAt,
        });

        const capturer = await this.accountRepo.findById(quote.captured_by);
        const firstName = ((capturer?.full_name ?? capturer?.display_name) || 'Someone').split(' ')[0];
        const body = buildSmsBody(firstName, quote.text, token);

        await twilioClient.sendSms(recipient.phone, body);
        await this.notifRepo.updateStatus(notification.id, 'sent', new Date());
      } catch (err) {
        if (notificationId) {
          await this.notifRepo.updateStatus(notificationId, 'failed').catch(() => undefined);
        }
        logger.error('SMS dispatch failed', { quoteId, err: (err as Error).message });
      }
    })();
  }
}
