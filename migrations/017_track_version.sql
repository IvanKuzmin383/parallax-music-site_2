-- Версия трека (опционально: Radio Edit, Remix и т.п.).
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS track_version TEXT;
