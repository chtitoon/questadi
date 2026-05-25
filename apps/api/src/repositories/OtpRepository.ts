import type { Sql } from 'postgres';
import { OtpCode } from '../types/index';

export class OtpRepository {
  constructor(private sql: Sql) {}

  async create(phone: string, code: string, expiresAt: Date): Promise<OtpCode> {
    const [row] = await this.sql<OtpCode[]>`
      INSERT INTO otp_codes (phone, code, expires_at)
      VALUES (${phone}, ${code}, ${expiresAt})
      RETURNING *`;
    return row;
  }

  async findValid(phone: string, code: string): Promise<OtpCode | null> {
    const [row] = await this.sql<OtpCode[]>`
      SELECT * FROM otp_codes
      WHERE phone = ${phone} AND code = ${code} AND used = false AND expires_at > now()
      ORDER BY created_at DESC
      LIMIT 1`;
    return row ?? null;
  }

  async markUsed(id: string): Promise<void> {
    await this.sql`UPDATE otp_codes SET used = true WHERE id = ${id}`;
  }

  async countRecentRequests(phone: string, since: Date): Promise<number> {
    const [{ count }] = await this.sql<[{ count: string }]>`
      SELECT COUNT(*) FROM otp_codes WHERE phone = ${phone} AND created_at > ${since}`;
    return parseInt(count, 10);
  }
}
