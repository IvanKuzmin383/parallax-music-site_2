import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import {
  getCabinetToken,
  getCabinetSession,
  destroyCabinetSessionsForEmail,
} from "@/lib/cabinet-auth"
import { getCabinetUserByEmail, updateCabinetUserPassword } from "@/lib/cabinet-users"

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10, "Пароль должен быть не менее 10 символов"),
})

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Некорректные данные" },
      { status: 400 }
    )
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: "Неверный текущий пароль" }, { status: 400 })
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return NextResponse.json(
      { error: "Новый пароль должен отличаться от текущего" },
      { status: 400 }
    )
  }

  const updated = await updateCabinetUserPassword(user.id, parsed.data.newPassword)
  if (!updated) {
    return NextResponse.json({ error: "Не удалось обновить пароль" }, { status: 500 })
  }

  // Остальные устройства выходим; текущая сессия остаётся.
  destroyCabinetSessionsForEmail(user.email, token)

  return NextResponse.json({ ok: true })
}
