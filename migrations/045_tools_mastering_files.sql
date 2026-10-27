-- Сохранённые WAV онлайн-мастеринга: повторное скачивание без повторной оплаты, TTL 14 дней.

CREATE TABLE IF NOT EXISTS tools_mastering_files (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  storage_name TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT tools_mastering_files_used_check CHECK (used IN ('free', 'credit'))
);

CREATE INDEX IF NOT EXISTS idx_tools_mastering_files_user_created
  ON tools_mastering_files (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tools_mastering_files_expires
  ON tools_mastering_files (expires_at);
