import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { MUSIC_VIDEO_PRICE_RUB } from "@/lib/music-video-pricing"
import { createOrder } from "@/lib/orders"
import {
  assertTbankConfigured,
  createCabinetTbankPayment,
  getSiteBaseUrl,
} from "@/lib/tbank-cabinet-payment"

const CONTACT_TYPE_VALUES = new Set(["telegram", "vk", "max"])
const PAYMENT_DESCRIPTION = "Загрузка видеоклипа на площадки"

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const tbankCfg = assertTbankConfigured()
  if (!tbankCfg.ok) {
    console.error("[payments/music-video/create] Missing TBANK env")
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
  const trackLink = typeof raw.trackLink === "string" ? raw.trackLink.trim() : ""
  const fileUrl = typeof raw.fileUrl === "string" ? raw.fileUrl.trim() : trackLink
  const comment = typeof raw.comment === "string" ? raw.comment.trim() : ""
  const contactType = typeof raw.contactType === "string" ? raw.contactType.trim().toLowerCase() : ""
  const contactValue = typeof raw.contactValue === "string" ? raw.contactValue.trim() : ""

  if (!trackTitle) {
    return NextResponse.json({ error: "Укажите название релиза или проекта" }, { status: 400 })
  }
  if (!fileUrl || !isHttpUrl(fileUrl)) {
    return NextResponse.json(
      { error: "Укажите рабочую ссылку на файл клипа (http/https)" },
      { status: 400 }
    )
  }
  if (comment.length < 2) {
    return NextResponse.json({ error: "Поле «Комментарий» обязательно" }, { status: 400 })
  }
  if (!CONTACT_TYPE_VALUES.has(contactType)) {
    return NextResponse.json({ error: "Выберите корректный контакт для связи" }, { status: 400 })
  }
  if (!contactValue || contactValue.length < 2) {
    return NextResponse.json({ error: "Укажите контакт для связи" }, { status: 400 })
  }

  const totalAmount = MUSIC_VIDEO_PRICE_RUB.toFixed(2)
  const isTelegramContact = contactType === "telegram"
  const order = await createOrder({
    orderType: "music_video",
    userId: user.id,
    tracksCount: 1,
    totalAmount,
    contactEmail: isTelegramContact ? undefined : `${contactType}: ${contactValue}`,
    contactTelegram: isTelegramContact ? contactValue : undefined,
    serviceDetails: {
      trackTitle,
      comment: [comment, `Файл клипа: ${fileUrl}`].filter(Boolean).join("\n"),
      contactType,
      contactValue,
    },
  })

  const returnUrl = `${siteBase}/cabinet/design/music-video?payment=return&orderId=${encodeURIComponent(order.id)}`
  const failUrl = `${siteBase}/cabinet/design/music-video?payment=fail&orderId=${encodeURIComponent(order.id)}`

  const pay = await createCabinetTbankPayment({
    orderId: order.id,
    totalAmount,
    description: PAYMENT_DESCRIPTION,
    successUrl: returnUrl,
    failUrl,
    orderType: "music_video",
    receiptEmail: user.email,
    receiptItemName: PAYMENT_DESCRIPTION,
    logPrefix: "payments/music-video/create",
  })

  if (!pay.ok) {
    return NextResponse.json({ error: pay.error }, { status: 500 })
  }

  return NextResponse.json({
    confirmationUrl: pay.confirmationUrl,
    paymentUrl: pay.confirmationUrl,
    paymentId: pay.paymentId,
  })
}
