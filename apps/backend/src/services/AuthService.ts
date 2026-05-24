import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { AccountRepository } from '../repositories/AccountRepository';
import { OtpRepository } from '../repositories/OtpRepository';
import { twilioClient } from '../lib/twilio';
import { AccountDto, RateLimitError, UnauthorizedError, ValidationError, toAccountDto } from '../types/index';

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

export class AuthService {
  constructor(
    private accountRepo: AccountRepository,
    private otpRepo: OtpRepository,
  ) {}

  async requestOtp(phone: string): Promise<void> {
    if (!PHONE_RE.test(phone)) {
      throw new ValidationError('Phone must be in E.164 format');
    }
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.otpRepo.countRecentRequests(phone, oneHourAgo);
    if (count >= 3) {
      throw new RateLimitError('Too many OTP requests. Try again in an hour.');
    }
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.otpRepo.create(phone, code, expiresAt);
    await twilioClient.sendOtp(phone, code);
  }

  async verifyOtp(
    phone: string,
    code: string,
    pool: Pool,
  ): Promise<{ token: string; account: AccountDto }> {
    const otp = await this.otpRepo.findValid(phone, code);
    if (!otp) {
      throw new UnauthorizedError('Invalid or expired code');
    }
    await this.otpRepo.markUsed(otp.id);

    const client = await pool.connect();
    let accountRow;
    try {
      await client.query('BEGIN');
      accountRow = await this.accountRepo.promoteToRegistered(phone, client);
      if (!accountRow) {
        accountRow = await this.accountRepo.createRegistered(phone, 'Me', 'ME');
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const token = jwt.sign(
      { sub: accountRow.id, phone: accountRow.phone },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' },
    );
    return { token, account: toAccountDto(accountRow) };
  }
}
