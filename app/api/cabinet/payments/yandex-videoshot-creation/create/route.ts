import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { createOrder } from "@/lib/orders"
import { YANDEX_VIDEOSHOT_CREATION_PRICE_RUB } from "@/lib/yandex-videoshot-creation-pricing"
import {
  assertTbankConfigured,
  createCabinetTbankPayment,
  getSiteBaseUrl,
} from "@/lib/tbank-cabinet-payment"
const CONTACT_TYPE_VALUES = new Set(["telegram", "vk", "max"])
const YOOKASSA_PAYMENT_DESCRIPTION = "Создание видеошота для Яндекс Музыки"

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const tbankCfg = assertTbankConfigured()
  if (!tbankCfg.ok) {
    console.error("[payments/yandex-videoshot-creation/create] Missing TBANK env")
    return NextResponse.json({ error: tbankCfg.error }, { status: 500 })
  }

  const siteBase = getSiteBaseUrl()

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
  const trackTitle = typeof raw.trackTitle === "string" ? raw.trackTitle.trim() : ""
  const comment = typeof raw.comment === "string" ? raw.comment.trim() : ""
  const contactType = typeof raw.contactType === "string" ? raw.contactType.trim().toLowerCase() : ""
  const contactValue = typeof raw.contactValue === "string" ? raw.contactValue.trim() : ""

  if (comment.length < 2) {
    return NextResponse.json({ error: "Поле «Пожелания / комментарии» обязательно" }, { status: 400 })
  }
  if (!CONTACT_TYPE_VALUES.has(contactType)) {
    return NextResponse.json({ error: "Выберите корректный контакт для связи" }, { status: 400 })
  }
  if (!contactValue || contactValue.length < 2) {
    return NextResponse.json({ error: "Укажите контакт для связи" }, { status: 400 })
  }

  const totalAmount = YANDEX_VIDEOSHOT_CREATION_PRICE_RUB.toFixed(2)
  const isTelegram = contactType === "telegram"
  const order = await createOrder({
    orderType: "yandex_videoshot_creation",
    userId: user.id,
    tracksCount: 1,
    totalAmount,
    contactEmail: isTelegram ? undefined : `${contactType}: ${contactValue}`,
    contactTelegram: isTelegram ? contactValue : undefined,
  })
  const returnUrl = `${siteBase}/cabinet/design/video-shots-publishing?payment=return&orderId=${encodeURIComponent(order.id)}`
  const failUrl = `${siteBase}/cabinet/promotion/yandex-videoshot-creation?payment=fail&orderId=${encodeURIComponent(order.id)}`

  const pay = await createCabinetTbankPayment({
    orderId: order.id,
    totalAmount,
    description: YOOKASSA_PAYMENT_DESCRIPTION,
    successUrl: returnUrl,
    failUrl,
    orderType: "yandex_videoshot_creation",
    receiptEmail: user.email,
    receiptItemName: YOOKASSA_PAYMENT_DESCRIPTION,
    logPrefix: "payments/yandex-videoshot-creation/create",
  })

  if (!pay.ok) {
    return NextResponse.json({ error: pay.error }, { status: 500 })
  }

  return NextResponse.json({ confirmationUrl: pay.confirmationUrl, paymentId: pay.paymentId })
}
