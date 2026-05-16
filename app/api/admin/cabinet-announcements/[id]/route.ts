import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  deleteCabinetAnnouncement,
  updateCabinetAnnouncement,
} from "@/lib/cabinet-announcements"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 })
  }

  let body: { title?: string; body?: string; active?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректное тело запроса" }, { status: 400 })
  }

  const patch: { title?: string; body?: string; active?: boolean } = {}
  if (typeof body.title === "string") patch.title = body.title
  if (typeof body.body === "string") patch.body = body.body
  if (typeof body.active === "boolean") patch.active = body.active

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 })
  }

  try {
    const updated = updateCabinetAnnouncement(id, patch)
    if (!updated) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 })
    }
    return NextResponse.json({ announcement: updated })
  } catch (error) {
    console.error("Error updating cabinet announcement:", error)
    return NextResponse.json({ error: "Не удалось обновить" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: "Некорректный id" }, { status: 400 })
  }

  try {
    const removed = deleteCabinetAnnouncement(id)
    if (!removed) {
      return NextResponse.json({ error: "Не найдено" }, { status: 404 })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error deleting cabinet announcement:", error)
    return NextResponse.json({ error: "Не удалось удалить" }, { status: 500 })
  }
}
