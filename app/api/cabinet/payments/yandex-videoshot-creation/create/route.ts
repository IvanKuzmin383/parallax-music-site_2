import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { createOrder, updateOrderStatus } from "@/lib/orders"
import { YANDEX_VIDEOSHOT_CREATION_PRICE_RUB } from "@/lib/yandex-videoshot-creation-pricing"

const YOOKASSA_API = "https://api.yookassa.ru/v3/payments"
const CONTACT_TYPE_VALUES = new Set(["telegram", "vk", "max"])
const YOOKASSA_PAYMENT_DESCRIPTION = "Создание видеошота для Яндекс Музыки"

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
      "[payments/yandex-videoshot-creation/create] Missing YOOKASSA env (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY)"
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
  const returnUrl = `${siteBase}/cabinet/promotion/yandex-videoshot-creation?payment=return&orderId=${encodeURIComponent(order.id)}`

  const idempotenceKey = crypto.randomUUID()
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64")

  const yookassaBody = {
    amount: { value: totalAmount, currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect" as const, return_url: returnUrl },
    description: YOOKASSA_PAYMENT_DESCRIPTION,
    metadata: {
      orderId: order.id,
      orderType: "yandex_videoshot_creation",
      userId: user.id,
      accountEmail: user.email,
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
    console.error("[payments/yandex-videoshot-creation/create] YooKassa request failed:", err)
    return NextResponse.json({ error: "Не удалось создать платёж, попробуйте позже" }, { status: 500 })
  }

  const data = (await res.json().catch(() => ({}))) as {
    id?: string
    confirmation?: { confirmation_url?: string }
    description?: string
  }

  if (!res.ok) {
    console.error("[payments/yandex-videoshot-creation/create] YooKassa error:", res.status, data)
    return NextResponse.json({ error: data.description || "Не удалось создать платёж" }, { status: 500 })
  }

  const paymentId = data.id
  const confirmationUrl = data.confirmation?.confirmation_url
  if (!paymentId || !confirmationUrl) {
    console.error("[payments/yandex-videoshot-creation/create] YooKassa response missing id or confirmation_url:", data)
    return NextResponse.json({ error: "Неверный ответ платёжной системы" }, { status: 500 })
  }

  await updateOrderStatus(order.id, "pending", { paymentId })
  return NextResponse.json({ confirmationUrl, paymentId })
}
