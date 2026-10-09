import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getPublickaStatsForUser } from "@/lib/publicka"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 401 })
  }

  const url = new URL(request.url)
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  const stats = await getPublickaStatsForUser(user.id, { from, to })
  return NextResponse.json(stats)
}
