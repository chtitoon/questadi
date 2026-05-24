import { Pool } from 'pg';
import { Notification } from '../types/index';

export interface CreateNotificationData {
  quote_id: string;
  recipient: string;
}

export class NotificationRepository {
  constructor(private pool: Pool) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const { rows } = await this.pool.query<Notification>(
      `INSERT INTO notifications (quote_id, recipient)
       VALUES ($1, $2)
       RETURNING *`,
      [data.quote_id, data.recipient],
    );
    return rows[0];
  }

  async updateStatus(
    id: string,
    status: 'pending' | 'sent' | 'delivered' | 'failed',
    sentAt?: Date,
  ): Promise<void> {
    await this.pool.query(
      `UPDATE notifications
       SET delivery_status = $2, sent_at = COALESCE($3, sent_at)
       WHERE id = $1`,
      [id, status, sentAt ?? null],
    );
  }

  async countRecent(recipientId: string, since: Date): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM notifications
       WHERE recipient = $1
         AND delivery_status IN ('pending','sent','delivered')
         AND (sent_at > $2 OR created_at > $2)`,
      [recipientId, since],
    );
    return parseInt(rows[0].count, 10);
  }
}
