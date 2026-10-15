-- Управляемые цены услуг (без подписок и тиров вертикальных видео).

CREATE TABLE IF NOT EXISTS service_prices (
  key TEXT PRIMARY KEY,
  price_rub NUMERIC(12, 2) NOT NULL,
  compare_at_rub NUMERIC(12, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
