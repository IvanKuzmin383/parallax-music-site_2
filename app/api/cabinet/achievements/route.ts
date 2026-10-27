import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  evaluateUserAchievements,
  getGamificationProgress,
} from "@/lib/cabinet-achievements"
import { listCouponsForUser, listUsedCouponsForUser } from "@/lib/cabinet-coupons"

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

  await evaluateUserAchievements(user.id)
  const progress = await getGamificationProgress(user.id)
  const [coupons, usedCoupons] = await Promise.all([
    listCouponsForUser(user.id, { activeOnly: true }),
    listUsedCouponsForUser(user.id),
  ])

  return NextResponse.json({ progress, coupons, usedCoupons })
}
