import { NextRequest, NextResponse } from "next/server"
import {
  type PlanId,
  isPlanId,
  calculateTotalAmount,
  planIdToSubscriptionName,
  getMaxPeriods,
  normalizePeriodsCount,
} from "@/lib/plan-pricing"
import { createOrder } from "@/lib/orders"
import { assertTbankConfigured } from "@/lib/tbank-cabinet-payment"
import { createTbankSubscriptionPayment } from "@/lib/tbank-subscription"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Period = "month" | "year"

type ValidInput = {
  planId: PlanId
  period: Period
  periodsCount: number
  email: string
  telegram?: string
  enableRecurrent: boolean
}

function validateInput(body: unknown): ValidInput | { error: string; code: string } {
  if (!body || typeof body !== "object") {
    return { error: "Invalid body", code: "invalid_body" }
  }

  const b = body as Record<string, unknown>
  const planIdRaw = b.planId
  const periodRaw = b.period
  const periodsCountRaw = b.periodsCount
  const emailRaw = b.email
  const telegramRaw = b.telegram

  if (
    b.consentPublicOffer !== true ||
    b.consentTermsOfUse !== true ||
    b.consentPersonalData !== true ||
    b.consentPrivacyPolicy !== true
  ) {
    return {
      error:
        "Необходимо подтвердить согласие с публичной офертой и лицензионными условиями, условиями использования, обработкой персональных данных и политикой конфиденциальности",
      code: "consent_required",
    }
  }

  if (typeof planIdRaw !== "string" || !isPlanId(planIdRaw)) {
    return { error: "Invalid plan", code: "invalid_plan" }
  }

  const period = periodRaw === "month" || periodRaw === "year" ? periodRaw : null
  if (!period) {
    return { error: "Invalid period", code: "invalid_period" }
  }

  const periodsCount =
    typeof periodsCountRaw === "number" && Number.isInteger(periodsCountRaw) ? periodsCountRaw : NaN
  const maxPeriods = getMaxPeriods(period)
  if (!Number.isFinite(periodsCount) || normalizePeriodsCount(period, periodsCount) !== periodsCount) {
    return { error: `Periods count must be 1-${maxPeriods}`, code: "invalid_periods" }
  }

  const email = typeof emailRaw === "string" ? emailRaw.trim() : ""
  if (!email || !EMAIL_REGEX.test(email)) {
    return { error: "Invalid email", code: "invalid_email" }
  }

  return {
    planId: planIdRaw as PlanId,
    period,
    periodsCount,
    email: email.toLowerCase(),
    telegram: typeof telegramRaw === "string" && telegramRaw.trim() ? telegramRaw.trim() : undefined,
    enableRecurrent: b.enableRecurrent !== false,
  }
}

export async function POST(request: NextRequest) {
  const tbankCfg = assertTbankConfigured()
  if (!tbankCfg.ok) {
    console.error("[payments/create] Missing TBANK env")
    return NextResponse.json(
      { error: "Payment configuration error", code: "config_error" },
      { status: 500 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "invalid_body" }, { status: 400 })
  }

  const validated = validateInput(body)
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error, code: validated.code }, { status: 400 })
  }

  const { planId, period, periodsCount, email, telegram, enableRecurrent } = validated

  const totalAmountNumber = calculateTotalAmount(planId, period, periodsCount)
  if (!Number.isFinite(totalAmountNumber) || totalAmountNumber <= 0) {
    console.error("[payments/create] Invalid total amount", { planId, period, periodsCount, totalAmountNumber })
    return NextResponse.json({ error: "Invalid plan configuration", code: "invalid_plan" }, { status: 400 })
  }
  const totalAmount = totalAmountNumber.toFixed(2)

  const order = await createOrder({
    orderType: "subscription",
    userEmail: email,
    telegram,
    planId,
    period,
    periodsCount,
    totalAmount,
  })

  const subscriptionName = planIdToSubscriptionName(planId)
  const periodLabel = period === "month" ? "мес" : "год"
  const description = `Подписка ${subscriptionName}, ${periodLabel} x ${periodsCount}, email ${email}`

  const pay = await createTbankSubscriptionPayment({
    orderId: order.id,
    totalAmount,
    description,
    customerEmail: email,
    planId,
    period,
    periodsCount,
    telegram,
    enableRecurrent,
    logPrefix: "payments/create",
  })

  if (!pay.ok) {
    return NextResponse.json(
      { error: pay.error, code: "payment_create_failed" },
      { status: 500 }
    )
  }

  return NextResponse.json({ confirmationUrl: pay.confirmationUrl, paymentId: pay.paymentId })
}
