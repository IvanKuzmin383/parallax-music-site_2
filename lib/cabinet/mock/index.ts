import type { TransactionView } from "../types"

export const TRANSACTION_TYPE_LABELS: Record<TransactionView["type"], string> = {
  topup: "Пополнение",
  service_payment: "Оплата услуги",
  royalty_credit: "Начисление роялти",
  withdrawal: "Вывод средств",
  referral_bonus: "Реферальное начисление",
  refund: "Возврат",
}
