import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { YANDEX_VIDEOSHOT_CREATION_PRICE_RUB } from "@/lib/yandex-videoshot-creation-pricing"
import {
  VIDEO_DIRECTION_OPTIONS,
  videoDirectionLabel,
  type VideoDirectionValue,
} from "@/lib/yandex-videoshot-mode"
const CONTACT_TYPE_VALUES = new Set(["telegram", "vk", "max"])
const DIRECTION_VALUES = new Set<string>(VIDEO_DIRECTION_OPTIONS.map((o) => o.value))
const PAYMENT_DESCRIPTION = "Создание видеошота для Яндекс Музыки"

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
  const comment = typeof raw.comment === "string" ? raw.comment.trim() : ""
  const contactType = typeof raw.contactType === "string" ? raw.contactType.trim().toLowerCase() : ""
  const contactValue = typeof raw.contactValue === "string" ? raw.contactValue.trim() : ""
  const directionRaw =
    typeof raw.videoDirection === "string" ? raw.videoDirection.trim().toLowerCase() : "team"
  const referencesUrl =
    typeof raw.referencesUrl === "string" ? raw.referencesUrl.trim() : ""

  if (!trackTitle || trackTitle.length < 2) {
    return NextResponse.json(
      { error: "Укажите ссылку на трек или демо" },
      { status: 400 },
    )
  }
  if (trackTitle.includes("://") && !isHttpUrl(trackTitle)) {
    return NextResponse.json(
      { error: "Укажите корректную ссылку на трек или демо (http/https)" },
      { status: 400 },
    )
  }
  if (comment.length < 2) {
    return NextResponse.json(
      { error: "Добавьте пожелания или напишите «На ваш вкус»" },
      { status: 400 },
    )
  }
  if (!DIRECTION_VALUES.has(directionRaw)) {
    return NextResponse.json({ error: "Выберите направление видеоряда" }, { status: 400 })
  }
  if (referencesUrl && !isHttpUrl(referencesUrl)) {
    return NextResponse.json(
      { error: "Укажите корректную ссылку на исходники или референсы (http/https)" },
      { status: 400 },
    )
  }
  if (!CONTACT_TYPE_VALUES.has(contactType)) {
    return NextResponse.json({ error: "Выберите корректный контакт для связи" }, { status: 400 })
  }
  if (!contactValue || contactValue.length < 2) {
    return NextResponse.json({ error: "Укажите контакт для связи" }, { status: 400 })
  }

  const videoDirection = videoDirectionLabel(directionRaw as VideoDirectionValue)
  const totalAmount = YANDEX_VIDEOSHOT_CREATION_PRICE_RUB.toFixed(2)
  const isTelegram = contactType === "telegram"
  const order = await createOrder({
    orderType: "yandex_videoshot_creation",
    userId: user.id,
    tracksCount: 1,
    totalAmount,
    contactEmail: isTelegram ? undefined : `${contactType}: ${contactValue}`,
    contactTelegram: isTelegram ? contactValue : undefined,
    serviceDetails: {
      trackTitle,
      comment,
      videoDirection,
      referencesUrl: referencesUrl || undefined,
      contactType,
      contactValue,
    },
  })

  const returnPath = "/cabinet/promotion/yandex-videoshot-creation"
  return respondWithWalletPayment(order)
}
