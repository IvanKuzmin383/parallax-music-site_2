-- Секунда начала звука для TikTok (превью/сниппет).
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS tiktok_sound_start_sec INTEGER;
