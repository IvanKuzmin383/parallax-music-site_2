-- Двухфакторная аутентификация (TOTP) для пользователей кабинета.
ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS totp_pending_secret TEXT;
