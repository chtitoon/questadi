import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { Sql } from 'postgres';
import { AccountRepository } from '../repositories/AccountRepository';
import { OtpRepository } from '../repositories/OtpRepository';
import type { TwilioClient } from '../lib/twilio';
import { AccountDto, RateLimitError, UnauthorizedError, ValidationError, toAccountDto } from '../types/index';

const PHONE_RE = /^\+[1-9]\d{6,14}$/;

export class AuthService {
  constructor(
    private accountRepo: AccountRepository,
    private otpRepo: OtpRepository,
    private sql: Sql,
    private jwtSecret: string,
    private twilio: TwilioClient,
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
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await this.otpRepo.create(phone, code, expiresAt);
    await this.twilio.sendOtp(phone, code);
  }

  async verifyOtp(phone: string, code: string): Promise<{ token: string; account: AccountDto }> {
    const otp = await this.otpRepo.findValid(phone, code);
    if (!otp) {
      throw new UnauthorizedError('Invalid or expired code');
    }
    await this.otpRepo.markUsed(otp.id);

    let accountRow = await this.sql.begin(sql =>
      this.accountRepo.promoteToRegistered(phone, sql),
    );
    if (!accountRow) {
      accountRow = await this.accountRepo.createRegistered(phone, 'Me', 'ME');
    }

    const token = jwt.sign(
      { sub: accountRow.id, phone: accountRow.phone },
      this.jwtSecret,
      { expiresIn: '7d' },
    );
    return { token, account: toAccountDto(accountRow) };
  }
}
