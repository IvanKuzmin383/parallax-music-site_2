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
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { listActiveCabinetArtistSubscriptionsByUserId } from "@/lib/cabinet-artist-subscriptions"
import { getSubscriptionPlanPurchaseBlockReason } from "@/lib/subscription-plan-eligibility"
import { getTracksByUserId } from "@/lib/tracks"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CABINET_RETURN = "/cabinet/subscription"

type Period = "month" | "year"
type PurchaseIntent = "extra_slot"

type ValidInput = {
  planId: PlanId
  period: Period
  periodsCount: number
  email: string
  telegram?: string
  enableRecurrent: boolean
  fromCabinet: boolean
  purchaseIntent?: PurchaseIntent
}

function sanitizeReturnPath(raw: unknown): string | null {
  if (typeof raw !== "string") return null
  const v = raw.trim()
  if (!v.startsWith("/cabinet")) return null
  if (v.includes("://") || v.includes("..")) return null
  return v.slice(0, 200)
}

function parsePurchaseIntent(raw: unknown): PurchaseIntent | undefined {
  return raw === "extra_slot" ? "extra_slot" : undefined
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
  const purchaseIntent = parsePurchaseIntent(b.purchaseIntent)

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

  if (purchaseIntent === "extra_slot" && planIdRaw === "label") {
    return {
      error: "Для неограниченного числа артистов оформите тариф Label, а не доп. слот",
      code: "invalid_intent",
    }
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
    fromCabinet: b.fromCabinet === true || Boolean(sanitizeReturnPath(b.returnPath)),
    purchaseIntent,
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

  let { planId, period, periodsCount, email, telegram, enableRecurrent, fromCabinet, purchaseIntent } =
    validated
  const bodyObj = body as Record<string, unknown>
  const returnPathHint = sanitizeReturnPath(bodyObj.returnPath)

  // Залогиненный кабинет: привязываем заказ к userId, email из сессии
  let userId: string | undefined
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (session) {
    const user = await getCabinetUserByEmail(session.email)
    if (user) {
      userId = user.id
      email = user.email.trim().toLowerCase()
      fromCabinet = true
    }
  }

  if (purchaseIntent === "extra_slot") {
    if (!session || !userId) {
      return NextResponse.json(
        { error: "Доп. слот доступен только из кабинета", code: "auth_required" },
        { status: 401 }
      )
    }
    const activeSlots = await listActiveCabinetArtistSubscriptionsByUserId(userId)
    if (activeSlots.some((s) => s.subscriptionName === "Label")) {
      return NextResponse.json(
        { error: "На тарифе Label дополнительные слоты не нужны", code: "label_unlimited" },
        { status: 400 }
      )
    }
    if (activeSlots.length === 0) {
      return NextResponse.json(
        {
          error: "Сначала оформите основную подписку, затем можно купить доп. слот артиста",
          code: "no_base_subscription",
        },
        { status: 400 }
      )
    }
  } else {
    // Start/Medium/Pro: нельзя купить, если в кабинете уже больше лимита треков / артистов
    const existingUser = await getCabinetUserByEmail(email)
    if (existingUser) {
      const tracks = await getTracksByUserId(existingUser.email)
      const block = getSubscriptionPlanPurchaseBlockReason(planId, tracks)
      if (block) {
        return NextResponse.json(
          { error: block, code: "plan_eligibility" },
          { status: 403 }
        )
      }
    }
  }

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
    userId,
    ...(purchaseIntent === "extra_slot"
      ? { serviceDetails: { subscriptionPurchaseIntent: "extra_slot" as const } }
      : {}),
  })

  const subscriptionName = planIdToSubscriptionName(planId)
  const periodLabel = period === "month" ? "мес" : "год"
  const description =
    purchaseIntent === "extra_slot"
      ? `Доп. слот артиста ${subscriptionName}, ${periodLabel} x ${periodsCount}, email ${email}`
      : `Подписка ${subscriptionName}, ${periodLabel} x ${periodsCount}, email ${email}`

  const returnPath = fromCabinet ? returnPathHint || CABINET_RETURN : null

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
    returnPath,
    logPrefix: "payments/create",
  })

  if (!pay.ok) {
    return NextResponse.json(
      { error: pay.error, code: "payment_create_failed" },
      { status: 500 }
    )
  }

  return NextResponse.json({
    confirmationUrl: pay.confirmationUrl,
    paymentId: pay.paymentId,
    orderId: order.id,
  })
}
