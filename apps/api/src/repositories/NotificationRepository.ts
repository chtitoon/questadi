import type { Sql } from 'postgres';
import { Notification } from '../types/index';

export interface CreateNotificationData {
  quote_id: string;
  recipient: string;
}

export class NotificationRepository {
  constructor(private sql: Sql) {}

  async create(data: CreateNotificationData): Promise<Notification> {
    const [row] = await this.sql<Notification[]>`
      INSERT INTO notifications (quote_id, recipient)
      VALUES (${data.quote_id}, ${data.recipient})
      RETURNING *`;
    return row;
  }

  async updateStatus(id: string, status: 'pending' | 'sent' | 'delivered' | 'failed', sentAt?: Date): Promise<void> {
    await this.sql`
      UPDATE notifications
      SET delivery_status = ${status}, sent_at = COALESCE(${sentAt ?? null}, sent_at)
      WHERE id = ${id}`;
  }

  async countRecent(recipientId: string, since: Date): Promise<number> {
    const [{ count }] = await this.sql<[{ count: string }]>`
      SELECT COUNT(*) FROM notifications
      WHERE recipient = ${recipientId}
        AND delivery_status IN ('pending', 'sent', 'delivered')
        AND (sent_at > ${since} OR created_at > ${since})`;
    return parseInt(count, 10);
  }
}
