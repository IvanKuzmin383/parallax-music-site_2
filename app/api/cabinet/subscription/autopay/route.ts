import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import {
  getCabinetUserByEmail,
  setCabinetUserAutopay,
} from "@/lib/cabinet-users"
import { calculateTotalAmount, isPlanId, planIdToSubscriptionName } from "@/lib/plan-pricing"
import { getLatestMoscowDisableDateYmdBeforeCharge } from "@/lib/business-days-ru"
import { createAutopayDisableToken, consumeAutopayDisableToken } from "@/lib/autopay-disable-tokens"
import { isEmailConfigured, sendAutopayDisableConfirmEmail } from "@/lib/email"

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("request_disable") }),
  z.object({ action: z.literal("confirm"), token: z.string().min(10) }),
])

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  let nextAmountRub: string | null = null
  if (
    user.autopayPlanId &&
    isPlanId(user.autopayPlanId) &&
    user.autopayPeriod &&
    user.autopayPeriodsCount != null
  ) {
    nextAmountRub = calculateTotalAmount(
      user.autopayPlanId,
      user.autopayPeriod,
      user.autopayPeriodsCount
    ).toFixed(2)
  }

  let disableDeadlineYmd: string | null = null
  if (user.autopayNextChargeAt) {
    disableDeadlineYmd = getLatestMoscowDisableDateYmdBeforeCharge(new Date(user.autopayNextChargeAt))
  }

  return NextResponse.json({
    autopayEnabled: Boolean(user.autopayEnabled && user.yookassaPaymentMethodId),
    autopayPlanId: user.autopayPlanId ?? null,
    autopayPlanName:
      user.autopayPlanId && isPlanId(user.autopayPlanId) ? planIdToSubscriptionName(user.autopayPlanId) : null,
    autopayNextChargeAt: user.autopayNextChargeAt ?? null,
    nextAmountRub,
    disableDeadlineYmd,
    manualDisableEmail: "parallaxmusiclabel@gmail.com",
  })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Ошибка валидации", details: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.action === "confirm") {
    const consumed = consumeAutopayDisableToken(parsed.data.token)
    if (!consumed) {
      return NextResponse.json({ error: "Ссылка недействительна или истекла" }, { status: 400 })
    }
    await setCabinetUserAutopay(consumed.userId, {
      yookassaPaymentMethodId: null,
      autopayEnabled: false,
      autopayPlanId: null,
      autopayPeriod: null,
      autopayPeriodsCount: null,
      autopayNextChargeAt: null,
      autopayLastReminderSentAt: null,
    })
    return NextResponse.json({ ok: true })
  }

  const cabinetToken = getCabinetToken(request)
  const session = getCabinetSession(cabinetToken)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  if (!user.autopayEnabled || !user.yookassaPaymentMethodId) {
    return NextResponse.json({ error: "Автопродление не подключено" }, { status: 400 })
  }

  if (!isEmailConfigured()) {
    return NextResponse.json({ error: "Отправка почты не настроена" }, { status: 503 })
  }

  const t = createAutopayDisableToken(user.id, user.email)
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(/\/$/, "")
  const confirmUrl = `${baseUrl}/cabinet/autopay/confirm?token=${encodeURIComponent(t)}`

  const mail = await sendAutopayDisableConfirmEmail({ to: user.email, confirmUrl })
  if (!mail.ok) {
    return NextResponse.json({ error: mail.error || "Не удалось отправить письмо" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
