import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  createCabinetAnnouncement,
  listAllCabinetAnnouncements,
} from "@/lib/cabinet-announcements"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const announcements = listAllCabinetAnnouncements()
    return NextResponse.json({ announcements })
  } catch (error) {
    console.error("Error listing admin cabinet announcements:", error)
    return NextResponse.json({ error: "Не удалось загрузить" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { title?: string; body?: string }
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

  try {
    const announcement = createCabinetAnnouncement(title, text)
    return NextResponse.json({ announcement })
  } catch (error) {
    console.error("Error creating cabinet announcement:", error)
    return NextResponse.json({ error: "Не удалось создать" }, { status: 500 })
  }
}
