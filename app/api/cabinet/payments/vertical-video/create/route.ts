import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { createOrder, updateOrderStatus } from "@/lib/orders"
import {
  getVerticalVideoUnitPrice,
  VERTICAL_VIDEO_MAX_COUNT,
  VERTICAL_VIDEO_MIN_COUNT,
} from "@/lib/vertical-video-pricing"

const YOOKASSA_API = "https://api.yookassa.ru/v3/payments"

const CONTACT_TYPE_VALUES = new Set(["telegram", "vk", "max"])

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  if (!shopId || !secretKey) {
    console.error(
      "[payments/vertical-video/create] Missing YOOKASSA env (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY)"
    )
    return NextResponse.json({ error: "Оплата временно недоступна" }, { status: 500 })
  }

  const siteBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru").replace(/\/$/, "")

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
  })
  const returnUrl = `${siteBase}/cabinet/promotion/vertical-video?payment=return&orderId=${encodeURIComponent(order.id)}`

  const description = "Разработка видеоконтента для социальных сетей и видеоплатформ"
  const idempotenceKey = crypto.randomUUID()
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64")

  const yookassaBody = {
    amount: { value: totalAmount, currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect" as const, return_url: returnUrl },
    description,
    metadata: {
      orderId: order.id,
      orderType: "vertical_video",
      userId: user.id,
      accountEmail: user.email,
      videosCount: String(videosCount),
      unitPrice: String(unitPrice),
      trackTitle,
      comment,
      contactType,
      contactValue,
    },
  }

  let res: Response
  try {
    res = await fetch(YOOKASSA_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
        "Idempotence-Key": idempotenceKey,
      },
      body: JSON.stringify(yookassaBody),
    })
  } catch (err) {
    console.error("[payments/vertical-video/create] YooKassa request failed:", err)
    return NextResponse.json(
      { error: "Не удалось создать платёж, попробуйте позже" },
      { status: 500 }
    )
  }

  const data = (await res.json().catch(() => ({}))) as {
    id?: string
    confirmation?: { confirmation_url?: string }
    description?: string
  }

  if (!res.ok) {
    console.error("[payments/vertical-video/create] YooKassa error:", res.status, data)
    return NextResponse.json(
      { error: data.description || "Не удалось создать платёж" },
      { status: 500 }
    )
  }

  const paymentId = data.id
  const confirmationUrl = data.confirmation?.confirmation_url
  if (!paymentId || !confirmationUrl) {
    console.error("[payments/vertical-video/create] YooKassa response missing id or confirmation_url:", data)
    return NextResponse.json({ error: "Неверный ответ платёжной системы" }, { status: 500 })
  }

  await updateOrderStatus(order.id, "pending", { paymentId })
  return NextResponse.json({ confirmationUrl, paymentId })
}
