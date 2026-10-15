import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { getServicePriceRub } from "@/lib/service-prices"
const CONTACT_TYPE_VALUES = new Set(["telegram", "vk", "max"])
const YOOKASSA_PAYMENT_DESCRIPTION = "Видеошот для Spotify"

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

  const totalAmount = (await getServicePriceRub("spotify_videoshot")).toFixed(2)
  const isTelegram = contactType === "telegram"
  const order = await createOrder({
    orderType: "spotify_videoshot",
    userId: user.id,
    tracksCount: 1,
    totalAmount,
    contactEmail: isTelegram ? undefined : `${contactType}: ${contactValue}`,
    contactTelegram: isTelegram ? contactValue : undefined,
    serviceDetails: {
      trackTitle: trackTitle || undefined,
      comment,
      contactType,
      contactValue,
    },
  })
  return respondWithWalletPayment(order)
}
