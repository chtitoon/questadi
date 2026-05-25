import type { Client } from 'pg';
import { QuoteLink, QuoteLinkWithRelations } from '../types/index';

export interface CreateQuoteLinkData {
  notification_id: string;
  token: string;
  expires_at: Date;
}

export class QuoteLinkRepository {
  constructor(private sql: Client) {}

  async create(data: CreateQuoteLinkData): Promise<QuoteLink> {
    const { rows: [row] } = await this.sql.query<QuoteLink>(
      `INSERT INTO web_tokens (notification_id, token, expires_at)
       VALUES ($1, $2, $3) RETURNING *`,
      [data.notification_id, data.token, data.expires_at],
    );
    return row;
  }

  async findByToken(token: string): Promise<QuoteLinkWithRelations | null> {
    const { rows: [row] } = await this.sql.query<QuoteLinkWithRelations>(
      `SELECT
         wt.id, wt.notification_id, wt.token, wt.expires_at, wt.created_at,
         n.quote_id,
         n.recipient,
         q.text          AS quote_text,
         q.is_public     AS quote_is_public,
         q.deleted_at    AS quote_deleted_at,
         q.captured_by   AS quote_captured_by,
         q.captured_at   AS quote_captured_at
       FROM web_tokens wt
       JOIN notifications n ON wt.notification_id = n.id
       JOIN quotes q         ON n.quote_id = q.id
       WHERE wt.token = $1`,
      [token],
    );
    return row ?? null;
  }
}
