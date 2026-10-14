import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { YANDEX_VIDEOSHOT_PRICE_RUB } from "@/lib/yandex-videoshot-pricing"
const CONTACT_TYPE_VALUES = new Set(["telegram", "vk", "max"])
const PAYMENT_DESCRIPTION = "Загрузка видеошота в Яндекс Музыку"

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
  const fileUrl = typeof raw.fileUrl === "string" ? raw.fileUrl.trim() : ""
  const comment = typeof raw.comment === "string" ? raw.comment.trim() : ""
  const contactType = typeof raw.contactType === "string" ? raw.contactType.trim().toLowerCase() : ""
  const contactValue = typeof raw.contactValue === "string" ? raw.contactValue.trim() : ""

  if (!trackTitle || !isHttpUrl(trackTitle)) {
    return NextResponse.json(
      { error: "Укажите ссылку на трек в Яндекс Музыке (http/https)" },
      { status: 400 },
    )
  }
  if (!fileUrl || !isHttpUrl(fileUrl)) {
    return NextResponse.json(
      { error: "Укажите ссылку на готовое видео (http/https)" },
      { status: 400 },
    )
  }
  if (!CONTACT_TYPE_VALUES.has(contactType)) {
    return NextResponse.json({ error: "Выберите корректный контакт для связи" }, { status: 400 })
  }
  if (!contactValue || contactValue.length < 2) {
    return NextResponse.json({ error: "Укажите контакт для связи" }, { status: 400 })
  }

  const totalAmount = YANDEX_VIDEOSHOT_PRICE_RUB.toFixed(2)
  const isTelegram = contactType === "telegram"
  const order = await createOrder({
    orderType: "yandex_videoshot",
    userId: user.id,
    tracksCount: 1,
    totalAmount,
    contactEmail: isTelegram ? undefined : `${contactType}: ${contactValue}`,
    contactTelegram: isTelegram ? contactValue : undefined,
    serviceDetails: {
      trackTitle,
      fileUrl,
      comment: comment || undefined,
      contactType,
      contactValue,
    },
  })

  const returnPath = "/cabinet/promotion/yandex-videoshot"
  return respondWithWalletPayment(order)
}
