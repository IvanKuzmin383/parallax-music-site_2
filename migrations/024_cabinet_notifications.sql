-- Личные уведомления кабинета (не путать с объявлениями/новостями).
CREATE TABLE IF NOT EXISTS cabinet_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  href TEXT,
  entity_type TEXT,
  entity_id TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cabinet_notifications_user_created
  ON cabinet_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cabinet_notifications_user_unread
  ON cabinet_notifications(user_id)
  WHERE read_at IS NULL;
