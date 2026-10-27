import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { getServicePriceRub } from "@/lib/service-prices"
import { TOOLS_STORY_VIDEO_CREDITS_PER_PURCHASE } from "@/lib/tools-story-video-pricing"
import {
  couponServiceDetailsFromPricing,
  resolveCouponPricingFromBody,
} from "@/lib/cabinet-coupon-apply"

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

  let raw: Record<string, unknown> = {}
  try {
    const body = await request.json()
    if (body && typeof body === "object") raw = body as Record<string, unknown>
  } catch {
    /* optional body */
  }

  const priceRub = await getServicePriceRub("tools_story_video")
  const priced = await resolveCouponPricingFromBody({
    userId: user.id,
    orderType: "tools_story_video_download",
    amountRub: priceRub,
    body: raw,
  })
  if (priced.error) {
    return NextResponse.json({ error: priced.error }, { status: 400 })
  }

  const order = await createOrder({
    orderType: "tools_story_video_download",
    userId: user.id,
    tracksCount: TOOLS_STORY_VIDEO_CREDITS_PER_PURCHASE,
    totalAmount: priced.amountRub.toFixed(2),
    serviceDetails: couponServiceDetailsFromPricing(priced),
  })

  return respondWithWalletPayment(order)
}
