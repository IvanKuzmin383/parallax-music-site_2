import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  destroyCabinetSessionById,
  destroyCabinetSessionsForEmail,
  getCabinetSession,
  getCabinetToken,
  listCabinetSessionsForEmail,
} from "@/lib/cabinet-auth"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const sessions = listCabinetSessionsForEmail(session.email, token)
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      createdAt: new Date(s.createdAt).toISOString(),
      lastSeenAt: new Date(s.lastSeenAt).toISOString(),
      userAgent: s.userAgent,
      ip: s.ip,
      current: s.current,
    })),
  })
}

const deleteSchema = z.object({
  allOthers: z.boolean().optional(),
  sessionId: z.string().uuid().optional(),
})

export async function DELETE(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  let json: unknown = {}
  try {
    json = await request.json()
  } catch {
    // empty body ok for allOthers via query
  }

  const parsed = deleteSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }

  if (parsed.data.allOthers) {
    const removed = destroyCabinetSessionsForEmail(session.email, token)
    return NextResponse.json({ ok: true, removed })
  }

  if (parsed.data.sessionId) {
    const currentList = listCabinetSessionsForEmail(session.email, token)
    const target = currentList.find((s) => s.id === parsed.data.sessionId)
    if (!target) {
      return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 })
    }
    if (target.current) {
      return NextResponse.json(
        { error: "Нельзя завершить текущую сессию здесь - используйте «Выйти»" },
        { status: 400 }
      )
    }
    destroyCabinetSessionById(session.email, parsed.data.sessionId)
    return NextResponse.json({ ok: true, removed: 1 })
  }

  return NextResponse.json({ error: "Укажите allOthers или sessionId" }, { status: 400 })
}
