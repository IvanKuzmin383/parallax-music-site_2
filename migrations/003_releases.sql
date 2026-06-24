-- Unified release entity for multi-step upload wizard
CREATE TABLE IF NOT EXISTS releases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('single', 'album')),
  title TEXT NOT NULL DEFAULT '',
  artist_name TEXT NOT NULL DEFAULT '',
  label_name TEXT NOT NULL DEFAULT 'Parallax Music',
  cover_path TEXT NOT NULL DEFAULT '',
  release_date TEXT,
  upc TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  wizard_step INTEGER NOT NULL DEFAULT 1,
  addons_json TEXT NOT NULL DEFAULT '{}',
  request_ai_cover BOOLEAN NOT NULL DEFAULT FALSE,
  bundle_order_id TEXT,
  album_id TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_releases_user_id ON releases(user_id);
CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);

ALTER TABLE tracks ADD COLUMN IF NOT EXISTS release_id TEXT;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS track_order INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_tracks_release_id ON tracks(release_id);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS release_id TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_release_id ON orders(release_id);
