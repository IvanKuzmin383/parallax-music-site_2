import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  SUPPORT_MESSAGE_MAX_LEN,
  appendSupportMessage,
  getSupportThreadByUserId,
  listSupportMessages,
  markSupportThreadReadForUser,
  normalizeSupportMessageBody,
  notifyStaffSupportMessageInBackground,
} from "@/lib/support-chat"

async function requireCabinetUser(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return null
  const user = await getCabinetUserByEmail(session.email)
  if (!user || user.isDisabled) return null
  return user
}

export async function GET(request: NextRequest) {
  const user = await requireCabinetUser(request)
  if (!user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const thread = await getSupportThreadByUserId(user.id)
    if (!thread) {
      return NextResponse.json({
        messages: [],
        unreadForUser: 0,
        threadStatus: null,
        threadId: null,
      })
    }

    const after = request.nextUrl.searchParams.get("after")
    const messages = await listSupportMessages(thread.id, { after })

    return NextResponse.json({
      messages,
      unreadForUser: thread.unreadForUser,
      threadStatus: thread.status,
      threadId: thread.id,
    })
  } catch (error) {
    console.error("[cabinet/support/messages] GET failed:", error)
    return NextResponse.json({ error: "Не удалось загрузить сообщения" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await requireCabinetUser(request)
  if (!user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
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
      {
        error: `Введите сообщение (до ${SUPPORT_MESSAGE_MAX_LEN} символов)`,
      },
      { status: 400 },
    )
  }

  try {
    const { thread, message } = await appendSupportMessage({
      author: "user",
      userId: user.id,
      body: text,
    })

    await markSupportThreadReadForUser(user.id)

    const displayName =
      user.artistName?.trim() ||
      [user.firstName, user.lastName].filter(Boolean).join(" ").trim() ||
      user.email

    notifyStaffSupportMessageInBackground({
      userEmail: user.email,
      userDisplayName: displayName,
      bodyPreview: text,
    })

    return NextResponse.json({ message, threadId: thread.id, threadStatus: thread.status })
  } catch (error) {
    console.error("[cabinet/support/messages] POST failed:", error)
    return NextResponse.json({ error: "Не удалось отправить сообщение" }, { status: 500 })
  }
}
