import type { Sql, TransactionSql } from 'postgres';
import { Account, AutocompleteRow } from '../types/index';

export function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export class AccountRepository {
  constructor(private sql: Sql) {}

  async upsertByPhone(phone: string, displayName: string, avatarInitials: string, createdBy: string): Promise<Account> {
    const [row] = await this.sql<Account[]>`
      INSERT INTO accounts (display_name, avatar_initials, phone, created_by)
      VALUES (${displayName}, ${avatarInitials}, ${phone}, ${createdBy})
      ON CONFLICT (phone) WHERE phone IS NOT NULL DO UPDATE
        SET display_name    = CASE WHEN accounts.registered = false THEN EXCLUDED.display_name    ELSE accounts.display_name    END,
            avatar_initials = CASE WHEN accounts.registered = false THEN EXCLUDED.avatar_initials ELSE accounts.avatar_initials END
      RETURNING *`;
    return row;
  }

  async createAnonymous(displayName: string, avatarInitials: string, createdBy: string): Promise<Account> {
    const [row] = await this.sql<Account[]>`
      INSERT INTO accounts (display_name, avatar_initials, created_by)
      VALUES (${displayName}, ${avatarInitials}, ${createdBy})
      RETURNING *`;
    return row;
  }

  async findById(id: string): Promise<Account | null> {
    const [row] = await this.sql<Account[]>`SELECT * FROM accounts WHERE id = ${id}`;
    return row ?? null;
  }

  async findByPhone(phone: string): Promise<Account | null> {
    const [row] = await this.sql<Account[]>`SELECT * FROM accounts WHERE phone = ${phone}`;
    return row ?? null;
  }

  // Returns null when no account exists for this phone yet (caller should createRegistered).
  // Must be called inside a transaction so the FOR UPDATE lock is held.
  async promoteToRegistered(phone: string, sql: TransactionSql): Promise<Account | null> {
    const locked = await sql<Account[]>`SELECT id FROM accounts WHERE phone = ${phone} FOR UPDATE`;
    if (!locked.length) return null;

    const [updated] = await sql<Account[]>`
      UPDATE accounts SET registered = true, last_active = now()
      WHERE phone = ${phone} AND registered = false
      RETURNING *`;
    if (updated) return updated;

    const [existing] = await sql<Account[]>`SELECT * FROM accounts WHERE phone = ${phone}`;
    return existing ?? null;
  }

  async createRegistered(phone: string, displayName: string, avatarInitials: string): Promise<Account> {
    const [row] = await this.sql<Account[]>`
      INSERT INTO accounts (phone, display_name, avatar_initials, registered, last_active)
      VALUES (${phone}, ${displayName}, ${avatarInitials}, true, now())
      RETURNING *`;
    return row;
  }

  async searchForAutocomplete(query: string, capturerId: string, limit: number): Promise<AutocompleteRow[]> {
    return this.sql<AutocompleteRow[]>`
      SELECT a.id, a.display_name, a.full_name, a.avatar_initials, a.phone,
             MAX(q.captured_at) AS last_quoted_at
      FROM accounts a
      LEFT JOIN quotes q
        ON q.attributed_to = a.id
       AND q.captured_by = ${capturerId}
       AND q.deleted_at IS NULL
      WHERE (a.display_name ILIKE ${query + '%'} OR a.full_name ILIKE ${query + '%'})
        AND EXISTS (
          SELECT 1 FROM quotes eq
          WHERE eq.attributed_to = a.id
            AND eq.captured_by = ${capturerId}
            AND eq.deleted_at IS NULL
        )
      GROUP BY a.id
      ORDER BY MAX(q.captured_at) DESC NULLS LAST, a.display_name ASC
      LIMIT ${limit}`;
  }
}
