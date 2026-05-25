import type { Client } from 'pg';
import { RemovalRequest } from '../types/index';

export class RemovalRequestRepository {
  constructor(private sql: Client) {}

  async existsForQuote(quoteId: string): Promise<boolean> {
    const { rows: [{ exists }] } = await this.sql.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM removal_requests WHERE quote_id = $1) AS exists`,
      [quoteId],
    );
    return exists;
  }

  async create(quoteId: string, message?: string): Promise<RemovalRequest> {
    const { rows: [row] } = await this.sql.query<RemovalRequest>(
      `INSERT INTO removal_requests (quote_id, message) VALUES ($1, $2) RETURNING *`,
      [quoteId, message ?? null],
    );
    return row;
  }
}
