-- Алиасы имён артистов для склейки статистики (смена имени ALEX-ZH → TELLET'z и т.п.).
CREATE TABLE IF NOT EXISTS music_artist_aliases (
  user_id TEXT NOT NULL,
  alias TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_music_artist_aliases_alias
  ON music_artist_aliases (alias);

-- Известный кейс: треки в кабинете TELLET'z, в выгрузках Yoga/DMB — ALEX-ZH.
INSERT INTO music_artist_aliases (user_id, alias, created_at)
VALUES (
  'alexander-zh-1981@yandex.ru',
  'ALEX-ZH',
  NOW()
)
ON CONFLICT (user_id, alias) DO NOTHING;
