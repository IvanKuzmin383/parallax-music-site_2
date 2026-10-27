import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { broadcastAdminCabinetNotification } from "@/lib/cabinet-notifications"

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    title?: string
    body?: string
    audience?: string
    userIds?: unknown
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 })
  }

  const title = typeof body.title === "string" ? body.title.trim() : ""
  const text = typeof body.body === "string" ? body.body.trim() : ""
  if (!title || !text) {
    return NextResponse.json({ error: "Заполните заголовок и текст" }, { status: 400 })
  }

  const audience = body.audience === "selected" ? "selected" : body.audience === "all" ? "all" : null
  if (!audience) {
    return NextResponse.json({ error: "Укажите аудиторию: all или selected" }, { status: 400 })
  }

  const userIds = Array.isArray(body.userIds)
    ? body.userIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : []

  if (audience === "selected" && userIds.length === 0) {
    return NextResponse.json({ error: "Выберите хотя бы одного пользователя" }, { status: 400 })
  }

  try {
    const result = await broadcastAdminCabinetNotification({
      title,
      body: text,
      audience,
      userIds,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error("Error broadcasting cabinet notifications:", error)
    return NextResponse.json({ error: "Не удалось отправить" }, { status: 500 })
  }
}
