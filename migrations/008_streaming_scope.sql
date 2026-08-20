-- Область дистрибуции: все площадки, только РФ или только зарубежные.
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS streaming_scope TEXT NOT NULL DEFAULT 'all';
