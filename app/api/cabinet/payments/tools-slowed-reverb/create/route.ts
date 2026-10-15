import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import { getServicePriceRub } from "@/lib/service-prices"
import { TOOLS_SLOWED_REVERB_CREDITS_PER_PURCHASE } from "@/lib/tools-slowed-reverb-pricing"

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

  const totalAmount = (await getServicePriceRub("tools_slowed_reverb")).toFixed(2)
  const order = await createOrder({
    orderType: "tools_slowed_reverb_download",
    userId: user.id,
    tracksCount: TOOLS_SLOWED_REVERB_CREDITS_PER_PURCHASE,
    totalAmount,
  })

  return respondWithWalletPayment(order)
}
