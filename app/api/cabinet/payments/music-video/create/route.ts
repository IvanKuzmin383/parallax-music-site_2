import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkKycVerifiedForDistribution } from "@/lib/cabinet-kyc-gate"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { getServicePriceRub } from "@/lib/service-prices"
import { createOrder } from "@/lib/orders"
import {
  applyCouponToOrderAmount,
  consumeCouponAfterOrder,
} from "@/lib/cabinet-coupon-apply"

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

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }
  const kycGate = checkKycVerifiedForDistribution(user)
  if (kycGate) {
    return NextResponse.json(kycGate.body, { status: kycGate.status })
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
  const releaseDateRaw =
    typeof raw.releaseDate === "string" ? raw.releaseDate.trim() : ""
  const previewRaw = raw.previewTimecodeSec
  const previewTimecodeSec =
    typeof previewRaw === "number"
      ? previewRaw
      : typeof previewRaw === "string" && previewRaw.trim()
        ? Number(previewRaw.trim())
        : NaN
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
    return NextResponse.json({ error: "Поле "Комментарий" обязательно" }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDateRaw)) {
    return NextResponse.json(
      { error: "Укажите дату публикации в формате ГГГГ-ММ-ДД" },
      { status: 400 }
    )
  }
  if (!Number.isFinite(previewTimecodeSec) || previewTimecodeSec < 0) {
    return NextResponse.json(
      { error: "Укажите таймкод превью в секундах (0 или больше)" },
      { status: 400 }
    )
  }
  if (!CONTACT_TYPE_VALUES.has(contactType)) {
    return NextResponse.json({ error: "Выберите корректный контакт для связи" }, { status: 400 })
  }
  if (!contactValue || contactValue.length < 2) {
    return NextResponse.json({ error: "Укажите контакт для связи" }, { status: 400 })
  }


  const couponCode = typeof raw.couponCode === "string" ? raw.couponCode.trim() : ""
  const basePriceRub = await getServicePriceRub("music_video")
  const priced = await applyCouponToOrderAmount({
    userId: user.id,
    orderType: "music_video",
    amountRub: basePriceRub,
    couponCode: couponCode || null,
  })
  if (priced.error) {
    return NextResponse.json({ error: priced.error }, { status: 400 })
  }
  if (priced.amountRub <= 0) {
    return NextResponse.json({ error: "Сумма после скидки некорректна" }, { status: 400 })
  }

  const totalAmount = priced.amountRub.toFixed(2)
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
      comment,
      fileUrl,
      releaseDate: releaseDateRaw,
      previewTimecodeSec: Math.trunc(previewTimecodeSec),
      contactType,
      contactValue,
      couponCode: priced.coupon?.code,
      couponId: priced.coupon?.id,
    },
  })


  return respondWithWalletPayment(order)
}
