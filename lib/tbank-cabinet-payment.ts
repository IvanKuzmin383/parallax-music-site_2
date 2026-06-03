import { getTbankConfig, initTbankPayment, rublesToKopecks, type TbankInitPaymentResult } from "@/lib/tbank-acquiring"
import { buildTbankTestReceipt, shouldSendTbankReceipt } from "@/lib/tbank-receipt"
import { updateOrderStatus } from "@/lib/orders"

export function getSiteBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(/\/$/, "")
}

export function getTbankNotificationUrl(): string {
  return process.env.TBANK_NOTIFICATION_URL?.trim() || `${getSiteBaseUrl()}/api/payments/tbank/webhook`
}

export function assertTbankConfigured(): { ok: true } | { ok: false; error: string } {
  if (!getTbankConfig()) {
    return { ok: false, error: "Оплата временно недоступна" }
  }
  return { ok: true }
}

export type CreateCabinetTbankPaymentParams = {
  orderId: string
  totalAmount: string
  description: string
  successUrl: string
  failUrl: string
  orderType: string
  receiptEmail: string
  receiptItemName?: string
  logPrefix: string
}

export async function createCabinetTbankPayment(
  params: CreateCabinetTbankPaymentParams
): Promise<
  | { ok: true; confirmationUrl: string; paymentId: string }
  | { ok: false; error: string; details?: unknown }
> {
  const cfg = assertTbankConfigured()
  if (!cfg.ok) {
    return { ok: false, error: cfg.error }
  }

  const amountKopecks = rublesToKopecks(params.totalAmount)
  if (amountKopecks <= 0) {
    return { ok: false, error: "Некорректная сумма заказа" }
  }

  const receipt =
    shouldSendTbankReceipt() ?
      buildTbankTestReceipt({
        email: params.receiptEmail,
        amountKopecks,
        itemName: params.receiptItemName || params.description.slice(0, 128),
      })
    : undefined

  const pay: TbankInitPaymentResult = await initTbankPayment({
    amountKopecks,
    orderId: params.orderId,
    description: params.description.slice(0, 140),
    successUrl: params.successUrl,
    failUrl: params.failUrl,
    notificationUrl: getTbankNotificationUrl(),
    receipt,
    data: {
      orderId: params.orderId,
      orderType: params.orderType,
    },
  })

  if (!pay.ok) {
    console.error(`[${params.logPrefix}] T-Bank Init error:`, pay.body)
    return {
      ok: false,
      error: pay.message || "Не удалось создать платёж",
      details: pay.body,
    }
  }

  await updateOrderStatus(params.orderId, "pending", { paymentId: pay.paymentId })

  return { ok: true, confirmationUrl: pay.paymentUrl, paymentId: pay.paymentId }
}
