import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import {
  getVerticalVideoUnitPrice,
  VERTICAL_VIDEO_MAX_COUNT,
  VERTICAL_VIDEO_MIN_COUNT,
} from "@/lib/vertical-video-pricing"
const CONTACT_TYPE_VALUES = new Set(["telegram", "vk", "max"])

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
  const videosCount = typeof raw.videosCount === "number" ? raw.videosCount : undefined
  const trackTitle = typeof raw.trackTitle === "string" ? raw.trackTitle.trim() : ""
  const comment = typeof raw.comment === "string" ? raw.comment.trim() : ""
  const contactType = typeof raw.contactType === "string" ? raw.contactType.trim().toLowerCase() : ""
  const contactValue = typeof raw.contactValue === "string" ? raw.contactValue.trim() : ""

  if (
    videosCount === undefined ||
    !Number.isInteger(videosCount) ||
    videosCount < VERTICAL_VIDEO_MIN_COUNT ||
    videosCount > VERTICAL_VIDEO_MAX_COUNT
  ) {
    return NextResponse.json(
      { error: `Количество видео должно быть от ${VERTICAL_VIDEO_MIN_COUNT} до ${VERTICAL_VIDEO_MAX_COUNT}` },
      { status: 400 }
    )
  }

  if (!trackTitle) {
    return NextResponse.json({ error: "Укажите название трека" }, { status: 400 })
  }

  if (!CONTACT_TYPE_VALUES.has(contactType)) {
    return NextResponse.json({ error: "Выберите корректный контакт для связи" }, { status: 400 })
  }

  if (!contactValue || contactValue.length < 2) {
    return NextResponse.json({ error: "Укажите контакт для связи" }, { status: 400 })
  }

  const unitPrice = getVerticalVideoUnitPrice(videosCount)
  const totalAmount = (videosCount * unitPrice).toFixed(2)

  const isTelegram = contactType === "telegram"
  const order = await createOrder({
    orderType: "vertical_video",
    userId: user.id,
    tracksCount: videosCount,
    totalAmount,
    contactEmail: isTelegram ? undefined : `${contactType}: ${contactValue}`,
    contactTelegram: isTelegram ? contactValue : undefined,
    serviceDetails: {
      trackTitle,
      comment: comment || undefined,
      videosCount,
      contactType,
      contactValue,
    },
  })
  return respondWithWalletPayment(order)
}
