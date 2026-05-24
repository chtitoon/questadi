import { Pool } from 'pg';
import { OtpCode } from '../types/index';

export class OtpRepository {
  constructor(private pool: Pool) {}

  async create(phone: string, code: string, expiresAt: Date): Promise<OtpCode> {
    const { rows } = await this.pool.query<OtpCode>(
      `INSERT INTO otp_codes (phone, code, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [phone, code, expiresAt],
    );
    return rows[0];
  }

  async findValid(phone: string, code: string): Promise<OtpCode | null> {
    const { rows } = await this.pool.query<OtpCode>(
      `SELECT * FROM otp_codes
       WHERE phone = $1 AND code = $2 AND used = false AND expires_at > now()
       ORDER BY created_at DESC
       LIMIT 1`,
      [phone, code],
    );
    return rows[0] ?? null;
  }

  async markUsed(id: string): Promise<void> {
    await this.pool.query(
      'UPDATE otp_codes SET used = true WHERE id = $1',
      [id],
    );
  }

  async countRecentRequests(phone: string, since: Date): Promise<number> {
    const { rows } = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*) FROM otp_codes WHERE phone = $1 AND created_at > $2',
      [phone, since],
    );
    return parseInt(rows[0].count, 10);
  }
}
