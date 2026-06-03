import crypto from "crypto"
import type { PlanId } from "@/lib/plan-pricing"
import { planIdToSubscriptionName } from "@/lib/plan-pricing"
import {
  chargeTbankRecurrentPayment,
  getTbankConfig,
  initTbankPayment,
  initTbankRecurrentChildPayment,
  rublesToKopecks,
} from "@/lib/tbank-acquiring"
import { buildTbankTestReceipt, shouldSendTbankReceipt } from "@/lib/tbank-receipt"
import { getTbankNotificationUrl, getSiteBaseUrl } from "@/lib/tbank-cabinet-payment"
import { updateOrderStatus } from "@/lib/orders"

/** Стабильный CustomerKey для привязки карты (рекурренты Т‑Банк). */
export function tbankCustomerKeyFromEmail(email: string): string {
  return crypto.createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 64)
}

export function buildSubscriptionTbankReceipt(params: {
  customerEmail: string
  planId: PlanId
  period: "month" | "year"
  periodsCount: number
  totalAmount: string
}) {
  const name = planIdToSubscriptionName(params.planId)
  const periodLabel = params.period === "month" ? "мес." : "год"
  const itemName = `Подписка ${name}, ${periodLabel} × ${params.periodsCount}`
  const amountKopecks = rublesToKopecks(params.totalAmount)
  return buildTbankTestReceipt({
    email: params.customerEmail,
    amountKopecks,
    itemName,
  })
}

export function subscriptionReturnUrls(planId: string, orderId: string): { successUrl: string; failUrl: string } {
  const siteBase = getSiteBaseUrl()
  const q = `payment=return&orderId=${encodeURIComponent(orderId)}`
  const fq = `payment=fail&orderId=${encodeURIComponent(orderId)}`
  const returnPath =
    process.env.TBANK_SUBSCRIPTION_RETURN_URL?.trim() ||
    process.env.YOOKASSA_RETURN_URL?.trim() ||
    `${siteBase}/pay/${planId}`
  const base = returnPath.replace(/\/$/, "")
  const sep = base.includes("?") ? "&" : "?"
  return {
    successUrl: `${base}${sep}${q}`,
    failUrl: `${base}${sep}${fq}`,
  }
}

export type CreateTbankSubscriptionPaymentParams = {
  orderId: string
  totalAmount: string
  description: string
  customerEmail: string
  planId: PlanId
  period: "month" | "year"
  periodsCount: number
  telegram?: string
  enableRecurrent?: boolean
  logPrefix?: string
}

export async function createTbankSubscriptionPayment(
  params: CreateTbankSubscriptionPaymentParams
): Promise<
  | { ok: true; confirmationUrl: string; paymentId: string }
  | { ok: false; error: string; details?: unknown }
> {
  if (!getTbankConfig()) {
    return { ok: false, error: "Оплата временно недоступна" }
  }

  const amountKopecks = rublesToKopecks(params.totalAmount)
  if (amountKopecks <= 0) {
    return { ok: false, error: "Некорректная сумма заказа" }
  }

  const customerKey = tbankCustomerKeyFromEmail(params.customerEmail)
  const { successUrl, failUrl } = subscriptionReturnUrls(params.planId, params.orderId)
  const saveRecurrent = params.enableRecurrent !== false

  const receipt =
    shouldSendTbankReceipt() ?
      buildSubscriptionTbankReceipt({
        customerEmail: params.customerEmail,
        planId: params.planId,
        period: params.period,
        periodsCount: params.periodsCount,
        totalAmount: params.totalAmount,
      })
    : undefined

  const pay = await initTbankPayment({
    amountKopecks,
    orderId: params.orderId,
    description: params.description.slice(0, 140),
    successUrl,
    failUrl,
    notificationUrl: getTbankNotificationUrl(),
    receipt,
    recurrent: saveRecurrent,
    customerKey,
    operationInitiatorType: saveRecurrent ? "1" : undefined,
    data: {
      orderId: params.orderId,
      orderType: "subscription",
      planId: params.planId,
      period: params.period,
      periodsCount: String(params.periodsCount),
      email: params.customerEmail,
      telegram: params.telegram ?? "",
      recurring: "false",
    },
  })

  if (!pay.ok) {
    console.error(`[${params.logPrefix ?? "tbank-subscription"}] Init error:`, pay.body)
    return {
      ok: false,
      error: pay.message || "Не удалось создать платёж",
      details: pay.body,
    }
  }

  await updateOrderStatus(params.orderId, "pending", { paymentId: pay.paymentId })

  return { ok: true, confirmationUrl: pay.paymentUrl, paymentId: pay.paymentId }
}

export async function createTbankSubscriptionRenewal(params: {
  orderId: string
  totalAmount: string
  description: string
  customerEmail: string
  planId: PlanId
  period: "month" | "year"
  periodsCount: number
  rebillId: string
  telegram?: string
}): Promise<{ ok: true; paymentId: string } | { ok: false; error: string; details?: unknown }> {
  if (!getTbankConfig()) {
    return { ok: false, error: "T-Bank not configured" }
  }

  const amountKopecks = rublesToKopecks(params.totalAmount)
  if (amountKopecks <= 0) {
    return { ok: false, error: "Invalid amount" }
  }

  const customerKey = tbankCustomerKeyFromEmail(params.customerEmail)
  const { successUrl, failUrl } = subscriptionReturnUrls(params.planId, params.orderId)

  const receipt =
    shouldSendTbankReceipt() ?
      buildSubscriptionTbankReceipt({
        customerEmail: params.customerEmail,
        planId: params.planId,
        period: params.period,
        periodsCount: params.periodsCount,
        totalAmount: params.totalAmount,
      })
    : undefined

  const childInit = await initTbankRecurrentChildPayment({
    amountKopecks,
    orderId: params.orderId,
    description: params.description.slice(0, 140),
    customerKey,
    notificationUrl: getTbankNotificationUrl(),
    successUrl,
    failUrl,
    receipt,
    data: {
      orderId: params.orderId,
      orderType: "subscription",
      planId: params.planId,
      period: params.period,
      periodsCount: String(params.periodsCount),
      email: params.customerEmail,
      telegram: params.telegram ?? "",
      recurring: "true",
    },
  })

  if (!childInit.ok) {
    return {
      ok: false,
      error: childInit.message || "Init failed",
      details: childInit.body,
    }
  }

  const charge = await chargeTbankRecurrentPayment({
    paymentId: childInit.paymentId,
    rebillId: params.rebillId,
  })

  if (!charge.ok) {
    return {
      ok: false,
      error: charge.message || "Charge failed",
      details: charge.body,
    }
  }

  await updateOrderStatus(params.orderId, "pending", { paymentId: childInit.paymentId })

  return { ok: true, paymentId: childInit.paymentId }
}
