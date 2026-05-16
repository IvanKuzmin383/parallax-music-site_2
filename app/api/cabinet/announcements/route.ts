import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { listPendingAnnouncementsForUser } from "@/lib/cabinet-announcements"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const user = await getCabinetUserByEmail(session.email)
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const announcements = listPendingAnnouncementsForUser(user.id)
    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("Error listing cabinet announcements:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить новости" },
      { status: 500 }
    )
  }
}
