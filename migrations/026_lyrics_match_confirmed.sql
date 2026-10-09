-- Подтверждение, что текст песни совпадает со словами (кабинетный визард).
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS lyrics_match_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
