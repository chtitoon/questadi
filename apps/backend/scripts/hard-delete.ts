import 'dotenv/config';
import { getPool } from '../src/lib/db';
import { logger } from '../src/lib/logger';

async function run(): Promise<void> {
  const pool = getPool();
  try {
    const quotesResult = await pool.query(
      `DELETE FROM quotes
       WHERE deleted_at IS NOT NULL
         AND deleted_at < now() - interval '30 days'`,
    );
    logger.info('Hard delete complete', { quotesDeleted: quotesResult.rowCount });

    const otpResult = await pool.query(
      `DELETE FROM otp_codes WHERE expires_at < now() - interval '1 day'`,
    );
    logger.info('OTP cleanup complete', { otpDeleted: otpResult.rowCount });
  } finally {
    await pool.end();
  }
}

run().catch(err => {
  logger.error('Hard delete failed', { err: (err as Error).message });
  process.exit(1);
});
