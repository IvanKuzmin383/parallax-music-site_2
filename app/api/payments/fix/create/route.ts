import { NextRequest, NextResponse } from "next/server"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  formatFixPackTotalAmount,
  isValidFixPackTracksCount,
  MAX_FIX_PACK_ORDER,
} from "@/lib/fix-pack-pricing"
import { createOrder } from "@/lib/orders"
import {
  assertTbankConfigured,
  createCabinetTbankPayment,
  getSiteBaseUrl,
} from "@/lib/tbank-cabinet-payment"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const tbankCfg = assertTbankConfigured()
  if (!tbankCfg.ok) {
    console.error("[payments/fix/create] Missing TBANK env")
    return NextResponse.json({ error: tbankCfg.error, code: "config_error" }, { status: 500 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "invalid_body" }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  if (
    b.consentPublicOffer !== true ||
    b.consentTermsOfUse !== true ||
    b.consentPersonalData !== true ||
    b.consentPrivacyPolicy !== true
  ) {
    return NextResponse.json(
      {
        error:
          "Необходимо подтвердить согласие с публичной офертой и лицензионными условиями, условиями использования, обработкой персональных данных и политикой конфиденциальности",
        code: "consent_required",
      },
      { status: 400 }
    )
  }

  const emailRaw = typeof b.email === "string" ? b.email.trim() : ""
  const email = emailRaw.toLowerCase()
  if (!email || !EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: "Invalid email", code: "invalid_email" }, { status: 400 })
  }

  const tracksCount = typeof b.tracksCount === "number" ? b.tracksCount : undefined
  if (!isValidFixPackTracksCount(tracksCount)) {
    return NextResponse.json(
      {
        error: `Количество треков должно быть от 1 до ${MAX_FIX_PACK_ORDER}`,
        code: "invalid_tracks_count",
      },
      { status: 400 }
    )
  }

  const existingUser = await getCabinetUserByEmail(email)
  if (
    existingUser?.subscriptionName &&
    existingUser.subscriptionName !== "Fix"
  ) {
    return NextResponse.json(
      {
        error:
          "На этот email уже оформлена подписка. Для тарифа Fix используйте другой email или обратитесь в поддержку.",
        code: "subscription_conflict",
      },
      { status: 400 }
    )
  }

  const telegram = typeof b.telegram === "string" && b.telegram.trim() ? b.telegram.trim() : undefined
  const totalAmount = formatFixPackTotalAmount(tracksCount)
  const description = `Тариф Fix: ${tracksCount} трек(ов), ${email}`

  const order = await createOrder({
    orderType: "fix_pack",
    userEmail: email,
    telegram,
    tracksCount,
    totalAmount,
    userId: existingUser?.id,
  })

  const siteBase = getSiteBaseUrl()
  const returnUrl = `${siteBase}/cabinet?payment=return&orderId=${encodeURIComponent(order.id)}&fix=1`
  const failUrl = `${siteBase}/pay/fix?payment=fail&orderId=${encodeURIComponent(order.id)}`

  const pay = await createCabinetTbankPayment({
    orderId: order.id,
    totalAmount,
    description,
    successUrl: returnUrl,
    failUrl,
    orderType: "fix_pack",
    receiptEmail: email,
    receiptItemName: `Дистрибуция треков Fix (${tracksCount} шт.)`,
    logPrefix: "payments/fix/create",
  })

  if (!pay.ok) {
    return NextResponse.json({ error: pay.error, code: "payment_error" }, { status: 500 })
  }

  return NextResponse.json({ confirmationUrl: pay.confirmationUrl, paymentId: pay.paymentId })
}
