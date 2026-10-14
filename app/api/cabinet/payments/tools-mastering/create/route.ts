import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { respondWithWalletPayment } from "@/lib/cabinet-wallet-pay"
import { createOrder } from "@/lib/orders"
import {
  TOOLS_MASTERING_CREDITS_PER_PURCHASE,
  TOOLS_MASTERING_DOWNLOAD_PRICE_RUB,
} from "@/lib/tools-mastering-pricing"

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

  const totalAmount = TOOLS_MASTERING_DOWNLOAD_PRICE_RUB.toFixed(2)
  const order = await createOrder({
    orderType: "tools_mastering_download",
    userId: user.id,
    tracksCount: TOOLS_MASTERING_CREDITS_PER_PURCHASE,
    totalAmount,
  })

  return respondWithWalletPayment(order)
}
