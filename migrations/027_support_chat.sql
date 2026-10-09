-- Чат поддержки: один тред на пользователя кабинета.
CREATE TABLE IF NOT EXISTS support_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'open',
  last_message_at TIMESTAMPTZ,
  unread_for_admin INTEGER NOT NULL DEFAULT 0,
  unread_for_user INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_threads_status_chk CHECK (status IN ('open', 'closed')),
  CONSTRAINT support_threads_unread_admin_chk CHECK (unread_for_admin >= 0),
  CONSTRAINT support_threads_unread_user_chk CHECK (unread_for_user >= 0)
);

CREATE INDEX IF NOT EXISTS idx_support_threads_last_message
  ON support_threads (last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_support_threads_unread_admin
  ON support_threads (unread_for_admin)
  WHERE unread_for_admin > 0;

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT support_messages_author_chk CHECK (author IN ('user', 'admin'))
);

CREATE INDEX IF NOT EXISTS idx_support_messages_thread_created
  ON support_messages (thread_id, created_at ASC);
