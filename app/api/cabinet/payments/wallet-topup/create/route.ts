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
  parseWalletTopupAmount,
  WALLET_TOPUP_MAX_RUB,
  WALLET_TOPUP_MIN_RUB,
} from "@/lib/wallet-topup-pricing"

const PAYMENT_DESCRIPTION = "Пополнение баланса кабинета"

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const tbankCfg = assertTbankConfigured()
  if (!tbankCfg.ok) {
    console.error("[payments/wallet-topup/create] Missing TBANK env")
    return NextResponse.json({ error: tbankCfg.error }, { status: 500 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const amount = parseWalletTopupAmount(raw.amount)
  if (amount == null) {
    return NextResponse.json(
      {
        error: `Укажите сумму от ${WALLET_TOPUP_MIN_RUB.toLocaleString("ru-RU")} до ${WALLET_TOPUP_MAX_RUB.toLocaleString("ru-RU")} ₽`,
      },
      { status: 400 }
    )
  }

  const totalAmount = amount.toFixed(2)
  const order = await createOrder({
    orderType: "wallet_topup",
    userId: user.id,
    totalAmount,
  })

  const siteBase = getSiteBaseUrl()
  const returnUrl = `${siteBase}/cabinet/finance/balance?payment=return&orderId=${encodeURIComponent(order.id)}`
  const failUrl = `${siteBase}/cabinet/finance/balance?payment=fail&orderId=${encodeURIComponent(order.id)}`

  const pay = await createCabinetTbankPayment({
    orderId: order.id,
    totalAmount,
    description: `${PAYMENT_DESCRIPTION}, ${amount.toLocaleString("ru-RU")} ₽`,
    successUrl: returnUrl,
    failUrl,
    orderType: "wallet_topup",
    receiptEmail: user.email,
    receiptItemName: PAYMENT_DESCRIPTION,
    logPrefix: "payments/wallet-topup/create",
  })

  if (!pay.ok) {
    return NextResponse.json({ error: pay.error }, { status: 500 })
  }

  return NextResponse.json({
    confirmationUrl: pay.confirmationUrl,
    paymentUrl: pay.confirmationUrl,
    paymentId: pay.paymentId,
    orderId: order.id,
  })
}
