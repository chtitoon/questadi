import type { Client } from 'pg';
import { Notification } from '../types/index';

export interface CreateNotificationData {
  quote_id: string;
  recipient: string;
}

export class NotificationRepository {
  constructor(private sql: Client) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const { rows: [row] } = await this.sql.query<Notification>(
      `INSERT INTO notifications (quote_id, recipient) VALUES ($1, $2) RETURNING *`,
      [data.quote_id, data.recipient],
    );
    return row;
  }

  async updateStatus(id: string, status: 'pending' | 'sent' | 'delivered' | 'failed', sentAt?: Date): Promise<void> {
    await this.sql.query(
      `UPDATE notifications
       SET delivery_status = $1, sent_at = COALESCE($2, sent_at)
       WHERE id = $3`,
      [status, sentAt ?? null, id],
    );
  }

  async countRecent(recipientId: string, since: Date): Promise<number> {
    const { rows: [{ count }] } = await this.sql.query<{ count: string }>(
      `SELECT COUNT(*) FROM notifications
       WHERE recipient = $1
         AND delivery_status IN ('pending', 'sent', 'delivered')
         AND (sent_at > $2 OR created_at > $2)`,
      [recipientId, since],
    );
    return parseInt(count, 10);
  }
}
