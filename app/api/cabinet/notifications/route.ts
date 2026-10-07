import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  countUnreadCabinetNotifications,
  listCabinetNotifications,
} from "@/lib/cabinet-notifications"

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

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "1"
  const limitRaw = Number(request.nextUrl.searchParams.get("limit") || "30")
  const limit = Number.isFinite(limitRaw) ? limitRaw : 30

  const [notifications, unreadCount] = await Promise.all([
    listCabinetNotifications(user.id, { limit, unreadOnly }),
    countUnreadCabinetNotifications(user.id),
  ])

  return NextResponse.json({ notifications, unreadCount })
}
