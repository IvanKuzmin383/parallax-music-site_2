import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { createOrder } from "@/lib/orders"
import {
  assertTbankConfigured,
  createCabinetTbankPayment,
  getSiteBaseUrl,
} from "@/lib/tbank-cabinet-payment"
import {
  TOOLS_MASTERING_CREDITS_PER_PURCHASE,
  TOOLS_MASTERING_DOWNLOAD_PRICE_RUB,
} from "@/lib/tools-mastering-pricing"

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const tbankCfg = assertTbankConfigured()
  if (!tbankCfg.ok) {
    console.error("[payments/tools-mastering/create] Missing TBANK env")
    return NextResponse.json({ error: tbankCfg.error }, { status: 500 })
  }

  const siteBase = getSiteBaseUrl()
  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const totalAmount = TOOLS_MASTERING_DOWNLOAD_PRICE_RUB.toFixed(2)
  const order = await createOrder({
    orderType: "tools_mastering_download",
    userId: user.id,
    tracksCount: TOOLS_MASTERING_CREDITS_PER_PURCHASE,
    totalAmount,
  })

  const returnUrl = `${siteBase}/cabinet/tools/mastering?payment=return&orderId=${encodeURIComponent(order.id)}`
  const failUrl = `${siteBase}/cabinet/tools/mastering?payment=fail&orderId=${encodeURIComponent(order.id)}`

  const pay = await createCabinetTbankPayment({
    orderId: order.id,
    totalAmount,
    description: `Онлайн-мастеринг: 1 скачивание, ${user.email}`,
    successUrl: returnUrl,
    failUrl,
    orderType: "tools_mastering_download",
    receiptEmail: user.email,
    receiptItemName: "Онлайн-мастеринг (скачивание)",
    logPrefix: "payments/tools-mastering/create",
  })

  if (!pay.ok) {
    return NextResponse.json({ error: pay.error }, { status: 500 })
  }

  return NextResponse.json({ confirmationUrl: pay.confirmationUrl, paymentId: pay.paymentId })
}
