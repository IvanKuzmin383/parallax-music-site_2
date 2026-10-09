-- Публичка (БизнесЗвук): размещения, статистика по дням/городам, учёт начисленных прослушиваний.
-- Видеоклипы: каталог дистрибуции клипов (аналог релизов).

CREATE TABLE IF NOT EXISTS publicka_placements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  track_id TEXT,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  external_key TEXT,
  order_id TEXT,
  credited_plays INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publicka_placements_user_id
  ON publicka_placements(user_id);

CREATE INDEX IF NOT EXISTS idx_publicka_placements_status
  ON publicka_placements(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_publicka_placements_user_external
  ON publicka_placements(user_id, external_key)
  WHERE external_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS publicka_stat_imports (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  total_plays INTEGER NOT NULL DEFAULT 0,
  rows_count INTEGER NOT NULL DEFAULT 0,
  matched_rows INTEGER NOT NULL DEFAULT 0,
  earnings_credited_rub DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  UNIQUE(file_hash)
);

CREATE TABLE IF NOT EXISTS publicka_daily_plays (
  placement_id TEXT NOT NULL REFERENCES publicka_placements(id) ON DELETE CASCADE,
  stat_date TEXT NOT NULL,
  plays INTEGER NOT NULL,
  PRIMARY KEY (placement_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_publicka_daily_plays_date
  ON publicka_daily_plays(stat_date);

CREATE TABLE IF NOT EXISTS publicka_daily_plays_by_city (
  placement_id TEXT NOT NULL REFERENCES publicka_placements(id) ON DELETE CASCADE,
  stat_date TEXT NOT NULL,
  city TEXT NOT NULL,
  plays INTEGER NOT NULL,
  PRIMARY KEY (placement_id, stat_date, city)
);

CREATE INDEX IF NOT EXISTS idx_publicka_daily_plays_by_city_date
  ON publicka_daily_plays_by_city(stat_date);

CREATE TABLE IF NOT EXISTS video_clips (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  track_id TEXT,
  order_id TEXT,
  file_url TEXT,
  cover_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  platforms_json TEXT,
  release_date TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_clips_user_id
  ON video_clips(user_id);

CREATE INDEX IF NOT EXISTS idx_video_clips_status
  ON video_clips(status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_video_clips_order_id
  ON video_clips(order_id)
  WHERE order_id IS NOT NULL;
