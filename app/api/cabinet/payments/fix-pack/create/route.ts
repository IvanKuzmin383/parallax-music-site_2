import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { isLegacyFixPricing } from "@/lib/fix-pricing-legacy"
import {
  formatFixPackTotalAmount,
  isValidFixPackTracksCount,
  MAX_FIX_PACK_ORDER,
} from "@/lib/fix-pack-pricing"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import {
  assertTbankConfigured,
  createCabinetTbankPayment,
  getSiteBaseUrl,
} from "@/lib/tbank-cabinet-payment"

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }


  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  // Первый пакет Fix - без подписки; докупка - на Fix.
  // Другие тарифы (Start/Medium/Pro/Label) блокируем.
  if (user.subscriptionName && user.subscriptionName !== "Fix") {
    return NextResponse.json(
      {
        error:
          "На аккаунте уже есть подписка. Пакет Fix доступен без календарной подписки - используйте другой email или обратитесь в поддержку.",
      },
      { status: 403 }
    )
  }

  if (user.subscriptionName === "Fix" && isLegacyFixPricing(user)) {
    return NextResponse.json(
      {
        error:
          "Для вашего аккаунта действует прежняя цена докупки. Используйте форму 'Купить дополнительные треки' в кабинете.",
        code: "legacy_fix_pricing",
      },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  if (raw.consentOfferLicense !== true) {
    return NextResponse.json(
      {
        error:
          "Необходимо подтвердить согласие и ознакомление с публичной офертой и лицензионными условиями",
      },
      { status: 400 }
    )
  }

  const tracksCount = typeof raw.tracksCount === "number" ? raw.tracksCount : undefined
  if (!isValidFixPackTracksCount(tracksCount)) {
    return NextResponse.json(
      { error: `Количество треков должно быть от 1 до ${MAX_FIX_PACK_ORDER}` },
      { status: 400 }
    )
  }

  const totalAmount = formatFixPackTotalAmount(tracksCount)
  const description = `Тариф Fix: ${tracksCount} трек(ов), ${user.email}`
  const payMethod = raw.payMethod === "card" ? "card" : "wallet"

  if (payMethod === "card") {
    const tbankCfg = assertTbankConfigured()
    if (!tbankCfg.ok) {
      console.error("[cabinet/fix-pack/create] Missing TBANK env")
      return NextResponse.json({ error: tbankCfg.error }, { status: 500 })
    }
  }

  const order = await createOrder({
    orderType: "fix_pack",
    userEmail: user.email,
    tracksCount,
    totalAmount,
    userId: user.id,
  })

  if (payMethod === "wallet") {
    return respondWithWalletPayment(order)
  }

  // Оплата картой через T-Bank: возврат в хаб тарифов, статус проверяется на сервере.
  const siteBase = getSiteBaseUrl()
  const pay = await createCabinetTbankPayment({
    orderId: order.id,
    totalAmount,
    description,
    successUrl: `${siteBase}/cabinet/subscription?payment=return&orderId=${encodeURIComponent(order.id)}&fix=1`,
    failUrl: `${siteBase}/cabinet/subscription?payment=fail&orderId=${encodeURIComponent(order.id)}&fix=1`,
    orderType: "fix_pack",
    receiptEmail: user.email,
    receiptItemName: `Дистрибуция треков Fix (${tracksCount} шт.)`,
    logPrefix: "cabinet/fix-pack/create",
  })

  if (!pay.ok) {
    return NextResponse.json({ error: pay.error }, { status: 500 })
  }

  return NextResponse.json({ confirmationUrl: pay.confirmationUrl, paymentId: pay.paymentId, orderId: order.id })
}
