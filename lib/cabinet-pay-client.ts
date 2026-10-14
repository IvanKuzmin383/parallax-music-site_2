/** Клиентская обработка ответа оплаты услуги (только баланс). */

export type CabinetPayResponse = {
  paid?: boolean
  confirmationUrl?: string
  paymentUrl?: string
  error?: string
  walletBalance?: number
  orderId?: string
  paymentId?: string
}

export function isCabinetPaidResponse(data: CabinetPayResponse): boolean {
  return data.paid === true
}
