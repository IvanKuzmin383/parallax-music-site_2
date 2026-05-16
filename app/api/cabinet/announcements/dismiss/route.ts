import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { dismissCabinetAnnouncement } from "@/lib/cabinet-announcements"

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  let body: { announcementId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 })
  }

  const announcementId = typeof body.announcementId === "string" ? body.announcementId.trim() : ""
  if (!announcementId) {
    return NextResponse.json({ error: "Укажите announcementId" }, { status: 400 })
  }

  try {
    const user = await getCabinetUserByEmail(session.email)
    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
    }

    const ok = dismissCabinetAnnouncement(user.id, announcementId)
    if (!ok) {
      return NextResponse.json({ error: "Новость не найдена" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error dismissing cabinet announcement:", error)
    return NextResponse.json({ error: "Не удалось сохранить" }, { status: 500 })
  }
}
