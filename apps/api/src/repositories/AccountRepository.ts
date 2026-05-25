import type { Client } from 'pg';
import { Account, AutocompleteRow } from '../types/index';

export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export class AccountRepository {
  constructor(private sql: Client) {}

  async upsertByPhone(phone: string, displayName: string, avatarInitials: string, createdBy: string): Promise<Account> {
    const { rows: [row] } = await this.sql.query<Account>(
      `INSERT INTO accounts (display_name, avatar_initials, phone, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (phone) WHERE phone IS NOT NULL DO UPDATE
         SET display_name    = CASE WHEN accounts.registered = false THEN EXCLUDED.display_name    ELSE accounts.display_name    END,
             avatar_initials = CASE WHEN accounts.registered = false THEN EXCLUDED.avatar_initials ELSE accounts.avatar_initials END
       RETURNING *`,
      [displayName, avatarInitials, phone, createdBy],
    );
    return row;
  }

  async createAnonymous(displayName: string, avatarInitials: string, createdBy: string): Promise<Account> {
    const { rows: [row] } = await this.sql.query<Account>(
      `INSERT INTO accounts (display_name, avatar_initials, created_by)
       VALUES ($1, $2, $3) RETURNING *`,
      [displayName, avatarInitials, createdBy],
    );
    return row;
  }

  async findById(id: string): Promise<Account | null> {
    const { rows: [row] } = await this.sql.query<Account>(
      `SELECT * FROM accounts WHERE id = $1`,
      [id],
    );
    return row ?? null;
  }

  async findByPhone(phone: string): Promise<Account | null> {
    const { rows: [row] } = await this.sql.query<Account>(
      `SELECT * FROM accounts WHERE phone = $1`,
      [phone],
    );
    return row ?? null;
  }

  // Returns null when no account exists for this phone yet (caller should createRegistered).
  // Must be called inside a transaction so the FOR UPDATE lock is held.
  async promoteToRegistered(phone: string, client: Client): Promise<Account | null> {
    const { rows: locked } = await client.query<Account>(
      `SELECT id FROM accounts WHERE phone = $1 FOR UPDATE`,
      [phone],
    );
    if (!locked.length) return null;

    const { rows: [updated] } = await client.query<Account>(
      `UPDATE accounts SET registered = true, last_active = now()
       WHERE phone = $1 AND registered = false RETURNING *`,
      [phone],
    );
    if (updated) return updated;

    const { rows: [existing] } = await client.query<Account>(
      `SELECT * FROM accounts WHERE phone = $1`,
      [phone],
    );
    return existing ?? null;
  }

  async createRegistered(phone: string, displayName: string, avatarInitials: string): Promise<Account> {
    const { rows: [row] } = await this.sql.query<Account>(
      `INSERT INTO accounts (phone, display_name, avatar_initials, registered, last_active)
       VALUES ($1, $2, $3, true, now()) RETURNING *`,
      [phone, displayName, avatarInitials],
    );
    return row;
  }

  async searchForAutocomplete(query: string, capturerId: string, limit: number): Promise<AutocompleteRow[]> {
    const { rows } = await this.sql.query<AutocompleteRow>(
      `SELECT a.id, a.display_name, a.full_name, a.avatar_initials, a.phone,
              MAX(q.captured_at) AS last_quoted_at
       FROM accounts a
       LEFT JOIN quotes q
         ON q.attributed_to = a.id
        AND q.captured_by = $2
        AND q.deleted_at IS NULL
       WHERE (a.display_name ILIKE $1 OR a.full_name ILIKE $1)
         AND EXISTS (
           SELECT 1 FROM quotes eq
           WHERE eq.attributed_to = a.id
             AND eq.captured_by = $2
             AND eq.deleted_at IS NULL
         )
       GROUP BY a.id
       ORDER BY MAX(q.captured_at) DESC NULLS LAST, a.display_name ASC
       LIMIT $3`,
      [query + '%', capturerId, limit],
    );
    return rows;
  }
}
