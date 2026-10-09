import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getSupportThreadById, markSupportThreadReadForAdmin } from "@/lib/support-chat"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(_request: NextRequest, context: RouteContext) {
  const token = getAdminToken(_request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await context.params
  const threadId = id?.trim()
  if (!threadId) {
    return NextResponse.json({ error: "Не указан диалог" }, { status: 400 })
  }

  try {
    const thread = await getSupportThreadById(threadId)
    if (!thread) {
      return NextResponse.json({ error: "Диалог не найден" }, { status: 404 })
    }
    await markSupportThreadReadForAdmin(threadId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[admin/support/read] failed:", error)
    return NextResponse.json({ error: "Не удалось отметить прочитанным" }, { status: 500 })
  }
}
