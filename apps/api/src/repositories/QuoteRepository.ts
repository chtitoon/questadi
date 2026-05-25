import type { Sql } from 'postgres';
import { Quote } from '../types/index';

export interface CreateQuoteData {
  text: string;
  captured_by: string;
  attributed_to: string | null;
}

export interface LibraryRow extends Quote {
  a_id: string | null;
  a_display_name: string | null;
  a_full_name: string | null;
  a_phone: string | null;
  a_avatar_initials: string | null;
  a_registered: boolean | null;
  a_created_at: Date | null;
  a_last_active: Date | null;
  a_created_by: string | null;
}

export class QuoteRepository {
  constructor(private sql: Sql) {}

  async create(data: CreateQuoteData): Promise<Quote> {
    const [row] = await this.sql<Quote[]>`
      INSERT INTO quotes (text, captured_by, attributed_to)
      VALUES (${data.text}, ${data.captured_by}, ${data.attributed_to})
      RETURNING *`;
    return row;
  }

  async findById(id: string): Promise<Quote | null> {
    const [row] = await this.sql<Quote[]>`SELECT * FROM quotes WHERE id = ${id}`;
    return row ?? null;
  }

  async findDuplicate(capturedBy: string, attributedTo: string | null, text: string): Promise<Quote | null> {
    const [row] = await this.sql<Quote[]>`
      SELECT * FROM quotes
      WHERE captured_by = ${capturedBy}
        AND attributed_to IS NOT DISTINCT FROM ${attributedTo}
        AND text = ${text}
        AND captured_at > now() - interval '60 seconds'
        AND deleted_at IS NULL
      LIMIT 1`;
    return row ?? null;
  }

  async getLibrary(capturedBy: string): Promise<LibraryRow[]> {
    return this.sql<LibraryRow[]>`
      SELECT
        q.*,
        a.id              AS a_id,
        a.display_name    AS a_display_name,
        a.full_name       AS a_full_name,
        a.phone           AS a_phone,
        a.avatar_initials AS a_avatar_initials,
        a.registered      AS a_registered,
        a.created_at      AS a_created_at,
        a.last_active     AS a_last_active,
        a.created_by      AS a_created_by
      FROM quotes q
      LEFT JOIN accounts a ON q.attributed_to = a.id
      WHERE q.captured_by = ${capturedBy} AND q.deleted_at IS NULL
      ORDER BY q.captured_at DESC`;
  }

  async softDelete(id: string, capturedBy: string): Promise<Quote | null> {
    const [row] = await this.sql<Quote[]>`
      UPDATE quotes SET deleted_at = now()
      WHERE id = ${id} AND captured_by = ${capturedBy} AND deleted_at IS NULL
      RETURNING *`;
    return row ?? null;
  }

  async getPublicByPerson(accountId: string): Promise<Quote[]> {
    return this.sql<Quote[]>`
      SELECT * FROM quotes
      WHERE attributed_to = ${accountId} AND is_public = true AND deleted_at IS NULL
      ORDER BY captured_at DESC`;
  }

  async setPublic(id: string): Promise<Quote | null> {
    const [row] = await this.sql<Quote[]>`
      UPDATE quotes SET is_public = true WHERE id = ${id} AND deleted_at IS NULL RETURNING *`;
    return row ?? null;
  }
}
