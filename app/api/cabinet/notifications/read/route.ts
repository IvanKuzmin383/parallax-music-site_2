import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  markAllCabinetNotificationsRead,
  markCabinetNotificationsRead,
} from "@/lib/cabinet-notifications"

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).max(100).optional(),
  all: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }

  const { ids, all } = parsed.data
  if (!all && (!ids || ids.length === 0)) {
    return NextResponse.json({ error: "Укажите ids или all" }, { status: 400 })
  }

  const updated = all
    ? await markAllCabinetNotificationsRead(user.id)
    : await markCabinetNotificationsRead(user.id, ids ?? [])

  return NextResponse.json({ ok: true, updated })
}
