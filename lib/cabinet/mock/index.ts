import type { TransactionView } from "../types"

export const TRANSACTION_TYPE_LABELS: Record<TransactionView["type"], string> = {
  topup: "Пополнение",
  service_payment: "Оплата услуги",
  royalty_credit: "Начисление роялти",
  royalty_to_wallet: "Перевод роялти на баланс",
  withdrawal: "Вывод средств",
  referral_bonus: "Реферальное начисление",
  refund: "Возврат",
}
