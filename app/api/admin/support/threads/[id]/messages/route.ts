import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import {
  SUPPORT_MESSAGE_MAX_LEN,
  appendSupportMessage,
  getSupportThreadById,
  listSupportMessages,
  markSupportThreadReadForAdmin,
  normalizeSupportMessageBody,
  notifyUserSupportReply,
} from "@/lib/support-chat"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  const token = getAdminToken(request)
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

    const after = request.nextUrl.searchParams.get("after")
    const messages = await listSupportMessages(thread.id, { after })

    return NextResponse.json({
      thread,
      messages,
    })
  } catch (error) {
    console.error("[admin/support/messages] GET failed:", error)
    return NextResponse.json({ error: "Не удалось загрузить сообщения" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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

  const text =
    body && typeof body === "object" && "body" in body
      ? normalizeSupportMessageBody((body as { body: unknown }).body)
      : null

  if (!text) {
    return NextResponse.json(
      { error: `Введите сообщение (до ${SUPPORT_MESSAGE_MAX_LEN} символов)` },
      { status: 400 },
    )
  }

  try {
    const thread = await getSupportThreadById(threadId)
    if (!thread) {
      return NextResponse.json({ error: "Диалог не найден" }, { status: 404 })
    }

    const { thread: updated, message } = await appendSupportMessage({
      author: "admin",
      threadId: thread.id,
      body: text,
    })

    await markSupportThreadReadForAdmin(thread.id)
    await notifyUserSupportReply({
      userId: thread.userId,
      threadId: thread.id,
      bodyPreview: text,
    })

    return NextResponse.json({ message, thread: updated })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "THREAD_NOT_FOUND") {
      return NextResponse.json({ error: "Диалог не найден" }, { status: 404 })
    }
    console.error("[admin/support/messages] POST failed:", error)
    return NextResponse.json({ error: "Не удалось отправить ответ" }, { status: 500 })
  }
}
