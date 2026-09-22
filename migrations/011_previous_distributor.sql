-- Название предыдущего дистрибьютора при переносе релиза.
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS previous_distributor TEXT;
