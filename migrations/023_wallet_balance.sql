-- Баланс кабинета (для оплаты услуг) отдельно от роялти (streaming_balance).
ALTER TABLE cabinet_users
  ADD COLUMN IF NOT EXISTS wallet_balance DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Журнал операций по балансу / роялти.
CREATE TABLE IF NOT EXISTS cabinet_balance_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  royalty_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
  wallet_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cabinet_balance_transactions_user_id
  ON cabinet_balance_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_cabinet_balance_transactions_created_at
  ON cabinet_balance_transactions(created_at);
