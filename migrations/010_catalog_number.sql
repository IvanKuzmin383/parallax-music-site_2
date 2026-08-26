-- Внутренний артикул релиза (например PRLXM000025), на уровне трека как UPC.
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS catalog_number TEXT;
