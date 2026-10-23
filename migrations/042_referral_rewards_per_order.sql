-- Партнёрка: несколько начислений на реферала (по заказам), уникальность по order_id.
-- Старый UNIQUE(referred_user_id) снимаем - лимит 3000 ₽ на реферала в коде.

ALTER TABLE cabinet_referral_rewards
  DROP CONSTRAINT IF EXISTS cabinet_referral_rewards_referred_user_id_key;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'cabinet_referral_rewards_referred_user_id_key'
  ) THEN
    DROP INDEX IF EXISTS cabinet_referral_rewards_referred_user_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cabinet_referral_rewards_order_id
  ON cabinet_referral_rewards (order_id)
  WHERE order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cabinet_referral_rewards_referred
  ON cabinet_referral_rewards (referred_user_id, created_at DESC);
