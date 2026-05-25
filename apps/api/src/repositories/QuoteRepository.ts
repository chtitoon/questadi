import type { Client } from 'pg';
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
  constructor(private sql: Client) {}

  async create(data: CreateQuoteData): Promise<Quote> {
    const { rows: [row] } = await this.sql.query<Quote>(
      `INSERT INTO quotes (text, captured_by, attributed_to) VALUES ($1, $2, $3) RETURNING *`,
      [data.text, data.captured_by, data.attributed_to],
    );
    return row;
  }

  async findById(id: string): Promise<Quote | null> {
    const { rows: [row] } = await this.sql.query<Quote>(
      `SELECT * FROM quotes WHERE id = $1`,
      [id],
    );
    return row ?? null;
  }

  async findDuplicate(capturedBy: string, attributedTo: string | null, text: string): Promise<Quote | null> {
    const { rows: [row] } = await this.sql.query<Quote>(
      `SELECT * FROM quotes
       WHERE captured_by = $1
         AND attributed_to IS NOT DISTINCT FROM $2
         AND text = $3
         AND captured_at > now() - interval '60 seconds'
         AND deleted_at IS NULL
       LIMIT 1`,
      [capturedBy, attributedTo, text],
    );
    return row ?? null;
  }

  async getLibrary(capturedBy: string): Promise<LibraryRow[]> {
    const { rows } = await this.sql.query<LibraryRow>(
      `SELECT
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
       WHERE q.captured_by = $1 AND q.deleted_at IS NULL
       ORDER BY q.captured_at DESC`,
      [capturedBy],
    );
    return rows;
  }

  async softDelete(id: string, capturedBy: string): Promise<Quote | null> {
    const { rows: [row] } = await this.sql.query<Quote>(
      `UPDATE quotes SET deleted_at = now()
       WHERE id = $1 AND captured_by = $2 AND deleted_at IS NULL RETURNING *`,
      [id, capturedBy],
    );
    return row ?? null;
  }

  async getPublicByPerson(accountId: string): Promise<Quote[]> {
    const { rows } = await this.sql.query<Quote>(
      `SELECT * FROM quotes
       WHERE attributed_to = $1 AND is_public = true AND deleted_at IS NULL
       ORDER BY captured_at DESC`,
      [accountId],
    );
    return rows;
  }

  async setPublic(id: string): Promise<Quote | null> {
    const { rows: [row] } = await this.sql.query<Quote>(
      `UPDATE quotes SET is_public = true WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id],
    );
    return row ?? null;
  }
}
