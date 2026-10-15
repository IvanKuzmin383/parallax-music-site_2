-- Коды подтверждения email при регистрации в кабинете.

CREATE TABLE IF NOT EXISTS email_verification_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_email
  ON email_verification_codes (email);

CREATE INDEX IF NOT EXISTS idx_email_verification_codes_expires_at
  ON email_verification_codes (expires_at);
