-- Отключить автосписание у пользователей только с legacy-привязкой ЮKassa (без T-Bank RebillId)
UPDATE cabinet_users
SET autopay_enabled = false
WHERE autopay_enabled = true
  AND (tbank_rebill_id IS NULL OR TRIM(tbank_rebill_id) = '')
  AND yookassa_payment_method_id IS NOT NULL
  AND TRIM(yookassa_payment_method_id) <> '';

-- Убрать legacy id способа оплаты ЮKassa
UPDATE cabinet_users
SET yookassa_payment_method_id = NULL
WHERE yookassa_payment_method_id IS NOT NULL;

-- Удалить отложенные привязки без T-Bank RebillId
DELETE FROM pending_subscription_autopay
WHERE tbank_rebill_id IS NULL OR TRIM(tbank_rebill_id) = '';

UPDATE pending_subscription_autopay
SET yookassa_payment_method_id = NULL
WHERE yookassa_payment_method_id IS NOT NULL;
