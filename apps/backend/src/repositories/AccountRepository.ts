import { Pool, PoolClient } from 'pg';
import { Account, AutocompleteRow } from '../types/index';

export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export class AccountRepository {
  constructor(private pool: Pool) {}

  async upsertByPhone(
    phone: string,
    displayName: string,
    avatarInitials: string,
    createdBy: string,
  ): Promise<Account> {
    // Always returns the row: updates display/initials only if not yet registered
    const { rows } = await this.pool.query<Account>(
      `INSERT INTO accounts (display_name, avatar_initials, phone, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone) WHERE phone IS NOT NULL DO UPDATE
         SET display_name    = CASE WHEN accounts.registered = false THEN EXCLUDED.display_name    ELSE accounts.display_name    END,
             avatar_initials = CASE WHEN accounts.registered = false THEN EXCLUDED.avatar_initials ELSE accounts.avatar_initials END
       RETURNING *`,
      [displayName, avatarInitials, phone, createdBy],
    );
    return rows[0];
  }

  async createAnonymous(
    displayName: string,
    avatarInitials: string,
    createdBy: string,
  ): Promise<Account> {
    const { rows } = await this.pool.query<Account>(
      `INSERT INTO accounts (display_name, avatar_initials, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [displayName, avatarInitials, createdBy],
    );
    return rows[0];
  }

  async findById(id: string): Promise<Account | null> {
    const { rows } = await this.pool.query<Account>(
      'SELECT * FROM accounts WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  }

  async findByPhone(phone: string): Promise<Account | null> {
    const { rows } = await this.pool.query<Account>(
      'SELECT * FROM accounts WHERE phone = $1',
      [phone],
    );
    return rows[0] ?? null;
  }

  async promoteToRegistered(phone: string, client: PoolClient): Promise<Account> {
    await client.query('SELECT id FROM accounts WHERE phone = $1 FOR UPDATE', [phone]);
    const { rows } = await client.query<Account>(
      `UPDATE accounts
       SET registered = true, last_active = now()
       WHERE phone = $1 AND registered = false
       RETURNING *`,
      [phone],
    );
    if (rows.length > 0) return rows[0];
    // Already registered — return existing row
    const existing = await client.query<Account>(
      'SELECT * FROM accounts WHERE phone = $1',
      [phone],
    );
    return existing.rows[0];
  }

  async createRegistered(
    phone: string,
    displayName: string,
    avatarInitials: string,
  ): Promise<Account> {
    const { rows } = await this.pool.query<Account>(
      `INSERT INTO accounts (phone, display_name, avatar_initials, registered, last_active)
       VALUES ($1, $2, $3, true, now())
       RETURNING *`,
      [phone, displayName, avatarInitials],
    );
    return rows[0];
  }

  async searchForAutocomplete(
    query: string,
    capturerId: string,
    limit: number,
  ): Promise<AutocompleteRow[]> {
    const { rows } = await this.pool.query<AutocompleteRow>(
      `SELECT a.id, a.display_name, a.full_name, a.avatar_initials, a.phone,
              MAX(q.captured_at) AS last_quoted_at
       FROM accounts a
       LEFT JOIN quotes q
         ON q.attributed_to = a.id
        AND q.captured_by = $2
        AND q.deleted_at IS NULL
       WHERE (a.display_name ILIKE $1 OR a.full_name ILIKE $1)
       GROUP BY a.id
       ORDER BY MAX(q.captured_at) DESC NULLS LAST, a.display_name ASC
       LIMIT $3`,
      [query + '%', capturerId, limit],
    );
    return rows;
  }
}
