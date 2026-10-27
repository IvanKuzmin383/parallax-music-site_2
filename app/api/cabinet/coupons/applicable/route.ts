import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { findBestCouponForOrder } from "@/lib/cabinet-coupon-apply"
import { roundMoney } from "@/lib/cabinet-balance"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }
  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const orderType = request.nextUrl.searchParams.get("orderType")?.trim() || ""
  const amountRaw = request.nextUrl.searchParams.get("amount")
  const amountRub = roundMoney(Number(amountRaw))
  if (!orderType) {
    return NextResponse.json({ error: "Укажите orderType" }, { status: 400 })
  }
  if (!Number.isFinite(amountRub) || amountRub <= 0) {
    return NextResponse.json({ error: "Укажите корректную сумму" }, { status: 400 })
  }

  const best = await findBestCouponForOrder({
    userId: user.id,
    orderType,
    amountRub,
  })
  if (!best) {
    return NextResponse.json({ available: false, coupon: null })
  }

  const finalAmountRub = roundMoney(Math.max(0, amountRub - best.discountRub))
  return NextResponse.json({
    available: true,
    coupon: {
      id: best.coupon.id,
      code: best.coupon.code,
      title: best.coupon.title,
      discountRub: best.discountRub,
      finalAmountRub,
      expiresAt: best.coupon.expiresAt,
    },
  })
}
