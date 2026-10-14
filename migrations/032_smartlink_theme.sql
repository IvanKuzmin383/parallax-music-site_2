-- Оформление публичного смартлинка (пресет, акцент, кнопки, порядок площадок).

ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS smartlink_theme TEXT;
