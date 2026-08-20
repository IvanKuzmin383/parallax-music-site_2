-- Учёт списания Fix-слотов по треку: возврат при отклонении, без повторного списания при доработке.
ALTER TABLE tracks
  ADD COLUMN IF NOT EXISTS fix_pack_credits_charged BOOLEAN NOT NULL DEFAULT FALSE;
