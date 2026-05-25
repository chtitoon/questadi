import type { Client } from 'pg';
import { OtpCode } from '../types/index';

export class OtpRepository {
  constructor(private sql: Client) {}

  async create(phone: string, code: string, expiresAt: Date): Promise<OtpCode> {
    const { rows: [row] } = await this.sql.query<OtpCode>(
      `INSERT INTO otp_codes (phone, code, expires_at) VALUES ($1, $2, $3) RETURNING *`,
      [phone, code, expiresAt],
    );
    return row;
  }

  async findValid(phone: string, code: string): Promise<OtpCode | null> {
    const { rows: [row] } = await this.sql.query<OtpCode>(
      `SELECT * FROM otp_codes
       WHERE phone = $1 AND code = $2 AND used = false AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, code],
    );
    return row ?? null;
  }

  async markUsed(id: string): Promise<void> {
    await this.sql.query(`UPDATE otp_codes SET used = true WHERE id = $1`, [id]);
  }

  async countRecentRequests(phone: string, since: Date): Promise<number> {
    const { rows: [{ count }] } = await this.sql.query<{ count: string }>(
      `SELECT COUNT(*) FROM otp_codes WHERE phone = $1 AND created_at > $2`,
      [phone, since],
    );
    return parseInt(count, 10);
  }
}
