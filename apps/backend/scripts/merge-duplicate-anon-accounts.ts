import 'dotenv/config';
import { getPool } from '../src/lib/db';
import { logger } from '../src/lib/logger';

async function run(): Promise<void> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Find groups of anonymous accounts with the same name and creator.
    // The oldest (min created_at) becomes the canonical account.
    const { rows: groups } = await client.query<{
      canonical_id: string;
      duplicate_ids: string[];
      display_name: string;
    }>(`
      SELECT
        (array_agg(id ORDER BY created_at ASC))[1]           AS canonical_id,
        (array_agg(id ORDER BY created_at ASC))[2:]          AS duplicate_ids,
        display_name
      FROM accounts
      WHERE phone IS NULL
        AND registered = false
      GROUP BY display_name, created_by
      HAVING COUNT(*) > 1
    `);

    if (groups.length === 0) {
      logger.info('No duplicate anonymous accounts found');
      await client.query('ROLLBACK');
      return;
    }

    let quotesRepointed = 0;
    let accountsDeleted = 0;

    for (const group of groups) {
      const { canonical_id, duplicate_ids, display_name } = group;
      logger.info('Merging', { display_name, canonical_id, duplicates: duplicate_ids });

      // Re-point quotes attributed to any duplicate → canonical
      const qResult = await client.query(
        `UPDATE quotes
         SET attributed_to = $1
         WHERE attributed_to = ANY($2::uuid[])`,
        [canonical_id, duplicate_ids],
      );
      quotesRepointed += qResult.rowCount ?? 0;

      // Re-point notifications sent to any duplicate → canonical
      await client.query(
        `UPDATE notifications
         SET recipient = $1
         WHERE recipient = ANY($2::uuid[])`,
        [canonical_id, duplicate_ids],
      );

      // Delete the duplicate account rows (no other FK references remain)
      const dResult = await client.query(
        `DELETE FROM accounts WHERE id = ANY($1::uuid[])`,
        [duplicate_ids],
      );
      accountsDeleted += dResult.rowCount ?? 0;
    }

    await client.query('COMMIT');
    logger.info('Merge complete', { groups: groups.length, quotesRepointed, accountsDeleted });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Merge failed, rolled back', { err: (err as Error).message });
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
