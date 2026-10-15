-- Промо-смартлинк для релизов до выхода + standalone смартлинки в Tools.

ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS smartlink_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS smartlinks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  artist_name TEXT NOT NULL DEFAULT '',
  cover_path TEXT,
  preview_audio_path TEXT,
  platform_links TEXT,
  theme_json TEXT,
  mode TEXT NOT NULL DEFAULT 'standalone',
  status TEXT NOT NULL DEFAULT 'draft',
  release_id TEXT,
  track_id TEXT,
  paid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT smartlinks_slug_unique UNIQUE (slug)
);

CREATE INDEX IF NOT EXISTS idx_smartlinks_user_id ON smartlinks (user_id);
CREATE INDEX IF NOT EXISTS idx_smartlinks_status ON smartlinks (status);
CREATE INDEX IF NOT EXISTS idx_smartlinks_release_id ON smartlinks (release_id);
