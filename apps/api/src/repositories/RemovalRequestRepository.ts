import type { Sql } from 'postgres';
import { RemovalRequest } from '../types/index';

export class RemovalRequestRepository {
  constructor(private sql: Sql) {}

  async existsForQuote(quoteId: string): Promise<boolean> {
    const [{ exists }] = await this.sql<[{ exists: boolean }]>`
      SELECT EXISTS(SELECT 1 FROM removal_requests WHERE quote_id = ${quoteId}) AS exists`;
    return exists;
  }

  async create(quoteId: string, message?: string): Promise<RemovalRequest> {
    const [row] = await this.sql<RemovalRequest[]>`
      INSERT INTO removal_requests (quote_id, message)
      VALUES (${quoteId}, ${message ?? null})
      RETURNING *`;
    return row;
  }
}
