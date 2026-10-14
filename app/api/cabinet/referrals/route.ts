import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getReferralStats } from "@/lib/cabinet-referrals"
import { getSiteBaseUrl } from "@/lib/tbank-cabinet-payment"

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

  let origin = "https://parallaxmusic.ru"
  try {
    origin = getSiteBaseUrl()
  } catch {
    const env = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "")
    if (env) origin = env
  }

  const stats = await getReferralStats(user.id, origin)
  return NextResponse.json({ stats })
}
