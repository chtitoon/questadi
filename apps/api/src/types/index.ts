import type { components } from './openapi';

// ── API DTO types (derived from OpenAPI spec) ─────────────────────────────────

export type AccountDto            = components['schemas']['Account'];
export type QuoteDto              = components['schemas']['Quote'];
export type AttributedToInput     = components['schemas']['AttributedToInput'];
export type CreateQuoteRequest    = components['schemas']['CreateQuoteRequest'];
export type AutocompleteResultDto = components['schemas']['AutocompleteResult'];
export type LibraryPersonGroupDto = components['schemas']['LibraryPersonGroup'];
export type LibraryResponseDto    = components['schemas']['LibraryResponse'];

// ── DB row types (snake_case — internal only) ─────────────────────────────────

export interface Account {
  id: string;
  display_name: string;
  full_name: string | null;
  phone: string | null;
  contact_id: string | null;
  avatar_initials: string;
  registered: boolean;
  created_at: Date;
  last_active: Date | null;
  created_by: string | null;
}

export interface Quote {
  id: string;
  text: string;
  captured_by: string;
  attributed_to: string | null;
  captured_at: Date;
  is_public: boolean;
  deleted_at: Date | null;
}

export interface Notification {
  id: string;
  quote_id: string;
  recipient: string;
  channel: 'sms';
  sent_at: Date | null;
  delivery_status: 'pending' | 'sent' | 'delivered' | 'failed';
}

export interface QuoteLink {
  id: string;
  notification_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

export interface OtpCode {
  id: string;
  phone: string;
  code: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface RemovalRequest {
  id: string;
  quote_id: string;
  requested_at: Date;
  message: string | null;
}

// Raw SQL shape returned by the autocomplete query
export interface AutocompleteRow {
  id: string;
  display_name: string;
  full_name: string | null;
  avatar_initials: string;
  phone: string | null;
  last_quoted_at: Date | null;
}

export interface QuoteLinkPayload {
  quoteId: string;
  quoteText: string;
  authorAccountId: string;
  authorDisplayName: string;
  capturerFirstName: string;
  captured_at: Date;
  is_public: boolean;
  removal_requested: boolean;
  token_expires_at: Date;
}

export interface PersonProfilePayload {
  accountId: string;
  displayName: string;
  quotes: Array<{ id: string; text: string; captured_at: Date }>;
}

export interface QuoteLinkWithRelations {
  id: string;
  notification_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
  quote_id: string;
  recipient: string;
  quote_text: string;
  quote_is_public: boolean;
  quote_deleted_at: Date | null;
  quote_captured_by: string;
  quote_captured_at: Date;
}

// ── DB → DTO mappers ──────────────────────────────────────────────────────────

export function toAccountDto(a: Account): AccountDto {
  return {
    id: a.id,
    displayName: a.display_name,
    fullName: a.full_name ?? null,
    phone: a.phone ?? null,
    contactId: a.contact_id ?? null,
    avatarInitials: a.avatar_initials,
    registered: a.registered,
    createdAt: a.created_at.toISOString(),
    lastActive: a.last_active?.toISOString() ?? null,
    createdBy: a.created_by ?? null,
  };
}

export function toQuoteDto(q: Quote): QuoteDto {
  return {
    id: q.id,
    text: q.text,
    capturedBy: q.captured_by,
    attributedTo: q.attributed_to ?? null,
    capturedAt: q.captured_at.toISOString(),
    isPublic: q.is_public,
  };
}

export function toAutocompleteResultDto(r: AutocompleteRow): AutocompleteResultDto {
  return {
    id: r.id,
    displayName: r.display_name,
    fullName: r.full_name ?? null,
    avatarInitials: r.avatar_initials,
    phone: r.phone ?? null,
    lastQuotedAt: r.last_quoted_at?.toISOString() ?? null,
  };
}

// ── AppError hierarchy ────────────────────────────────────────────────────────

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super('NOT_FOUND', 404, message); this.name = 'NotFoundError'; }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super('UNAUTHORIZED', 401, message); this.name = 'UnauthorizedError'; }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super('FORBIDDEN', 403, message); this.name = 'ForbiddenError'; }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflict') { super('CONFLICT', 409, message); this.name = 'ConflictError'; }
}
export class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') { super('RATE_LIMITED', 429, message); this.name = 'RateLimitError'; }
}
export class GoneError extends AppError {
  constructor(code: 'TOKEN_EXPIRED' | 'QUOTE_DELETED', message: string) { super(code, 410, message); this.name = 'GoneError'; }
}
export class ValidationError extends AppError {
  constructor(message: string) { super('VALIDATION_ERROR', 400, message); this.name = 'ValidationError'; }
}

// ── JWT ───────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  phone: string;
  iat: number;
  exp: number;
}

