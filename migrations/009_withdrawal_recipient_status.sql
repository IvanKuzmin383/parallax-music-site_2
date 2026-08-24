-- Статус получателя и прогнозный расчёт удержаний при выводе роялти физлицу.
ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS recipient_status TEXT,
  ADD COLUMN IF NOT EXISTS payout_gross DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS payout_ndfl DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS payout_insurance DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS payout_net DOUBLE PRECISION;
