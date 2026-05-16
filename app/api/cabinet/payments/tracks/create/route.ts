import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { createOrder } from "@/lib/orders"
import { getTrackPriceRubByCreatedAt, MAX_TRACKS_TOPUP } from "@/lib/track-pricing"

const YOOKASSA_API = "https://api.yookassa.ru/v3/payments"

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const shopId = process.env.YOOKASSA_SHOP_ID
  const secretKey = process.env.YOOKASSA_SECRET_KEY
  const returnUrl = process.env.YOOKASSA_RETURN_URL
  if (!shopId || !secretKey || !returnUrl) {
    console.error("[payments/tracks/create] Missing YOOKASSA env (YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, YOOKASSA_RETURN_URL)")
    return NextResponse.json(
      { error: "Оплата временно недоступна" },
      { status: 500 }
    )
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  if (user.subscriptionName !== "Fix") {
    return NextResponse.json(
      { error: "Покупка дополнительных треков доступна только для тарифа Fix" },
      { status: 403 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  if (raw.consentOfferLicense !== true) {
    return NextResponse.json(
      {
        error:
          "Необходимо подтвердить согласие и ознакомление с публичной офертой и лицензионными условиями",
      },
      { status: 400 }
    )
  }

  const tracksCount = typeof raw.tracksCount === "number" ? raw.tracksCount : undefined

  if (
    tracksCount === undefined ||
    !Number.isInteger(tracksCount) ||
    tracksCount < 1 ||
    tracksCount > MAX_TRACKS_TOPUP
  ) {
    return NextResponse.json(
      { error: `Количество треков должно быть от 1 до ${MAX_TRACKS_TOPUP}` },
      { status: 400 }
    )
  }

  const trackPriceRub = getTrackPriceRubByCreatedAt(user.createdAt)
  const totalAmount = (tracksCount * trackPriceRub).toFixed(2)

  const order = await createOrder({
    orderType: "tracks_topup",
    userId: user.id,
    tracksCount,
    totalAmount,
  })

  const idempotenceKey = crypto.randomUUID()
  const auth = Buffer.from(`${shopId}:${secretKey}`).toString("base64")

  const yookassaBody = {
    amount: { value: totalAmount, currency: "RUB" },
    capture: true,
    confirmation: { type: "redirect" as const, return_url: returnUrl },
    description: `Оплата услуги (тариф Fix): ${tracksCount} шт., email ${user.email}`,
    metadata: {
      orderId: order.id,
      orderType: "tracks_topup",
      userId: user.id,
      tracksCount: String(tracksCount),
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
    console.error("[payments/tracks/create] YooKassa request failed:", err)
    return NextResponse.json(
      { error: "Не удалось создать платёж, попробуйте позже" },
      { status: 500 }
    )
  }

  const data = await res.json().catch(() => ({})) as {
    id?: string
    confirmation?: { confirmation_url?: string }
    description?: string
    code?: string
  }

  if (!res.ok) {
    console.error("[payments/tracks/create] YooKassa error:", res.status, data)
    return NextResponse.json(
      { error: data.description || "Не удалось создать платёж" },
      { status: 500 }
    )
  }

  const paymentId = data.id
  const confirmationUrl = data.confirmation?.confirmation_url

  if (!paymentId || !confirmationUrl) {
    console.error("[payments/tracks/create] YooKassa response missing id or confirmation_url:", data)
    return NextResponse.json(
      { error: "Неверный ответ платёжной системы" },
      { status: 500 }
    )
  }

  const { updateOrderStatus } = await import("@/lib/orders")
  await updateOrderStatus(order.id, "pending", { paymentId })

  return NextResponse.json({ confirmationUrl, paymentId })
}
