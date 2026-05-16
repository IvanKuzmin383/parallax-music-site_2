import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import {
  type PlanId,
  isPlanId,
  calculateTotalAmount,
  planIdToSubscriptionName,
  getMaxPeriods,
  normalizePeriodsCount,
} from "@/lib/plan-pricing"
import { createOrder, updateOrderStatus } from "@/lib/orders"
import {
  buildSubscriptionReceipt,
  merchantCustomerIdFromEmail,
  shouldSendYooKassaReceipt,
} from "@/lib/yookassa-subscription"

const YOOKASSA_API = "https://api.yookassa.ru/v3/payments"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Period = "month" | "year"

type ValidInput = {
  planId: PlanId
  period: Period
  periodsCount: number
  email: string
  telegram?: string
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
  }
}

export async function POST(request: NextRequest) {
  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  const returnUrl = process.env.YOOKASSA_RETURN_URL

  if (!shopId || !secretKey || !returnUrl) {
    console.error(
      "[payments/create] Missing YOOKASSA env (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, YOOKASSA_RETURN_URL)"
    )
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

  const { planId, period, periodsCount, email, telegram } = validated

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

  const idempotenceKey = crypto.randomUUID()
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64")

  /**
   * Рекурренты / сохранение карты: только если ЮKassa включила магазину автоплатежи.
   * По умолчанию false — иначе API вернёт 403. Включить: YOOKASSA_SAVE_PAYMENT_METHOD=true в .env
   */
  const savePaymentMethod = process.env.YOOKASSA_SAVE_PAYMENT_METHOD === "true"

  const yookassaBody: Record<string, unknown> = {
    amount: {
      value: totalAmount,
      currency: "RUB",
    },
    confirmation: {
      type: "redirect" as const,
      return_url: returnUrl,
    },
    capture: true,
    description,
    ...(savePaymentMethod ? { save_payment_method: true as const } : {}),
    merchant_customer_id: merchantCustomerIdFromEmail(email),
    metadata: {
      orderId: order.id,
      orderType: "subscription",
      planId,
      period,
      periodsCount: String(periodsCount),
      email,
      telegram: telegram ?? "",
      recurring: "false",
    },
  }

  if (shouldSendYooKassaReceipt()) {
    yookassaBody.receipt = buildSubscriptionReceipt({
      customerEmail: email,
      planId,
      period,
      periodsCount,
      totalAmount,
    })
  }

  let res: Response
  try {
    res = await fetch(YOOKASSA_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        "Idempotence-Key": idempotenceKey,
      },
      body: JSON.stringify(yookassaBody),
    })
  } catch (err) {
    console.error("[payments/create] YooKassa request failed:", err)
    return NextResponse.json(
      { error: "Не удалось создать платёж, попробуйте позже", code: "payment_request_failed" },
      { status: 500 }
    )
  }

  const data = (await res.json().catch(() => ({}))) as {
    id?: string
    confirmation?: { confirmation_url?: string }
    description?: string
    code?: string
  }

  if (!res.ok) {
    console.error("[payments/create] YooKassa error:", res.status, data)
    return NextResponse.json(
      { error: data.description || "Не удалось создать платёж", code: data.code || "payment_create_failed" },
      { status: 500 }
    )
  }

  const paymentId = data.id
  const confirmationUrl = data.confirmation?.confirmation_url

  if (!paymentId || !confirmationUrl) {
    console.error("[payments/create] YooKassa response missing id or confirmation_url:", data)
    return NextResponse.json(
      { error: "Неверный ответ платёжной системы", code: "payment_response_invalid" },
      { status: 500 }
    )
  }

  await updateOrderStatus(order.id, "pending", { paymentId })

  return NextResponse.json({ confirmationUrl, paymentId })
}

