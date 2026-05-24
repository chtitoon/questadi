CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE accounts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name    TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 100),
  full_name       TEXT,
  phone           TEXT CHECK (phone ~ '^\+[1-9]\d{6,14}$'),
  contact_id      TEXT,
  avatar_initials TEXT NOT NULL CHECK (char_length(avatar_initials) BETWEEN 1 AND 2),
  registered      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active     TIMESTAMPTZ,
  created_by      UUID REFERENCES accounts(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX idx_accounts_phone ON accounts(phone) WHERE phone IS NOT NULL;

CREATE TABLE quotes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text          TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  captured_by   UUID NOT NULL REFERENCES accounts(id),
  attributed_to UUID REFERENCES accounts(id) ON DELETE SET NULL,
  captured_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_public     BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_quotes_captured_by   ON quotes(captured_by)   WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_attributed_to ON quotes(attributed_to) WHERE deleted_at IS NULL;

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  recipient       UUID NOT NULL REFERENCES accounts(id),
  channel         TEXT NOT NULL DEFAULT 'sms' CHECK (channel = 'sms'),
  sent_at         TIMESTAMPTZ,
  delivery_status TEXT NOT NULL DEFAULT 'pending'
                    CHECK (delivery_status IN ('pending','sent','delivered','failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE web_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  token           TEXT NOT NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX idx_web_tokens_token ON web_tokens(token);

CREATE TABLE otp_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_otp_phone_active ON otp_codes(phone, used, expires_at);

CREATE TABLE removal_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id     UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  message      TEXT
);
