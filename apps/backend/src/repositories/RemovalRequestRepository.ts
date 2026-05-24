import { Pool } from 'pg';
import { RemovalRequest } from '../types/index';

export class RemovalRequestRepository {
  constructor(private pool: Pool) {}

  async existsForQuote(quoteId: string): Promise<boolean> {
    const { rows } = await this.pool.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM removal_requests WHERE quote_id = $1) AS exists',
      [quoteId],
    );
    return rows[0].exists;
  }

  async create(quoteId: string, message?: string): Promise<RemovalRequest> {
    const { rows } = await this.pool.query<RemovalRequest>(
      `INSERT INTO removal_requests (quote_id, message)
       VALUES ($1, $2)
       RETURNING *`,
      [quoteId, message ?? null],
    );
    return rows[0];
  }
}
