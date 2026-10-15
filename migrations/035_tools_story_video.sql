-- Сторис из трека в Tools: 1 бесплатный download навсегда + платные кредиты.

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS tools_story_video_free_used BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS tools_story_video_credits INTEGER NOT NULL DEFAULT 0;
