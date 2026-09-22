-- Ненормативная лексика: NULL = не выбрано, TRUE/FALSE = Да/Нет.
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS has_explicit_language BOOLEAN;
