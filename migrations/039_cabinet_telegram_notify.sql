-- Привязка Telegram для личных уведомлений кабинета (не staff-бот).

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS telegram_username TEXT;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS telegram_linked_at TIMESTAMPTZ;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS telegram_notify_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS telegram_notify_releases BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS telegram_notify_payments BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS telegram_notify_withdrawals BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS telegram_notify_royalty BOOLEAN NOT NULL DEFAULT TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cabinet_users_telegram_chat_id
  ON cabinet_users (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS cabinet_telegram_link_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cabinet_telegram_link_codes_user
  ON cabinet_telegram_link_codes (user_id);

CREATE INDEX IF NOT EXISTS idx_cabinet_telegram_link_codes_expires
  ON cabinet_telegram_link_codes (expires_at);
