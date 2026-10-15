import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { getServicePriceRub } from "@/lib/service-prices"
import { TOOLS_STORY_VIDEO_CREDITS_PER_PURCHASE } from "@/lib/tools-story-video-pricing"

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

  const totalAmount = (await getServicePriceRub("tools_story_video")).toFixed(2)
  const order = await createOrder({
    orderType: "tools_story_video_download",
    userId: user.id,
    tracksCount: TOOLS_STORY_VIDEO_CREDITS_PER_PURCHASE,
    totalAmount,
  })

  return respondWithWalletPayment(order)
}
