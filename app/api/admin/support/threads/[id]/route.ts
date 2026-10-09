import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  getSupportThreadById,
  setSupportThreadStatus,
  type SupportThreadStatus,
} from "@/lib/support-chat"

type RouteContext = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: RouteContext) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const threadId = id?.trim()
  if (!threadId) {
    return NextResponse.json({ error: "Не указан диалог" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const status =
    body && typeof body === "object" && "status" in body
      ? (body as { status: unknown }).status
      : null

  if (status !== "open" && status !== "closed") {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 })
  }

  try {
    const existing = await getSupportThreadById(threadId)
    if (!existing) {
      return NextResponse.json({ error: "Диалог не найден" }, { status: 404 })
    }
    const thread = await setSupportThreadStatus(threadId, status as SupportThreadStatus)
    return NextResponse.json({ thread })
  } catch (error) {
    console.error("[admin/support/thread] PATCH failed:", error)
    return NextResponse.json({ error: "Не удалось обновить статус" }, { status: 500 })
  }
}
