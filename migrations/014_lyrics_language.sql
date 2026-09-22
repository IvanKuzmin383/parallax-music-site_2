-- Язык текста песни (пустая строка / NULL = не выбран).
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS lyrics_language TEXT;
