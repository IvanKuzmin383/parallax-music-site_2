import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { isLegacyFixPricing } from "@/lib/fix-pricing-legacy"
import { getTrackPriceRubByCreatedAt, MAX_TRACKS_TOPUP } from "@/lib/track-pricing"
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

  if (user.subscriptionName !== "Fix") {
    return NextResponse.json(
      { error: "Покупка дополнительных треков доступна только для тарифа Fix" },
      { status: 403 }
    )
  }

  if (!isLegacyFixPricing(user)) {
    return NextResponse.json(
      {
        error: "Используйте покупку пакета треков с актуальными ценами (500/400/350 ₽).",
        code: "use_fix_pack_pricing",
      },
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
  const description = `Оплата услуги (тариф Fix): ${tracksCount} шт., email ${user.email}`

  const order = await createOrder({
    orderType: "tracks_topup",
    userId: user.id,
    tracksCount,
    totalAmount,
  })

  return respondWithWalletPayment(order)
}
