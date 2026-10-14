-- Геймификация: рефералка, ачивки, купоны/награды.

ALTER TABLE cabinet_users ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE cabinet_users ADD COLUMN IF NOT EXISTS referred_by_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cabinet_users_referral_code
  ON cabinet_users(referral_code)
  WHERE referral_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cabinet_users_referred_by
  ON cabinet_users(referred_by_user_id)
  WHERE referred_by_user_id IS NOT NULL;

-- Разблокированные ачивки (каталог в коде).
CREATE TABLE IF NOT EXISTS cabinet_user_achievements (
  user_id TEXT NOT NULL,
  achievement_id TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL,
  reward_note TEXT,
  PRIMARY KEY (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_cabinet_user_achievements_unlocked
  ON cabinet_user_achievements(user_id, unlocked_at DESC);

-- Одноразовый бонус рефереру за первую оплату приглашённого.
CREATE TABLE IF NOT EXISTS cabinet_referral_rewards (
  id TEXT PRIMARY KEY,
  referrer_user_id TEXT NOT NULL,
  referred_user_id TEXT NOT NULL UNIQUE,
  order_id TEXT,
  amount_rub DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cabinet_referral_rewards_referrer
  ON cabinet_referral_rewards(referrer_user_id, created_at DESC);

-- Купоны (скидки с лимитом ₽). Погашение - в оплатах услуг.
CREATE TABLE IF NOT EXISTS cabinet_coupons (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  percent_off DOUBLE PRECISION,
  amount_off_rub DOUBLE PRECISION,
  max_discount_rub DOUBLE PRECISION NOT NULL DEFAULT 300,
  service_scope TEXT NOT NULL DEFAULT 'services',
  source TEXT,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  used_order_id TEXT,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cabinet_coupons_user
  ON cabinet_coupons(user_id, created_at DESC);
