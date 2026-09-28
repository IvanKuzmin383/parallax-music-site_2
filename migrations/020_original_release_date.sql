-- Оригинальная дата релиза при переносе с другого дистрибьютора.
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS original_release_date TEXT;
