-- Черновики настроек сниппета (story-video) в кабинете.

CREATE TABLE IF NOT EXISTS cabinet_story_video_drafts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  track_id TEXT,
  settings_json TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cabinet_story_video_drafts_user_updated
  ON cabinet_story_video_drafts (user_id, updated_at DESC);
