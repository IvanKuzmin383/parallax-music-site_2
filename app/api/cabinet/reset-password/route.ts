import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { consumePasswordResetToken } from "@/lib/password-reset-tokens"
import { updateCabinetUserPassword } from "@/lib/cabinet-users"

const resetSchema = z.object({
  token: z.string().min(1, "Токен обязателен"),
  newPassword: z.string().min(10, "Пароль должен быть не менее 10 символов"),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = resetSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверные данные", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const payload = await consumePasswordResetToken(parsed.data.token)
  if (!payload) {
    return NextResponse.json(
      { error: "Ссылка недействительна или истекла. Запросите восстановление пароля снова." },
      { status: 400 }
    )
  }

  const updated = await updateCabinetUserPassword(payload.userId, parsed.data.newPassword)
  if (!updated) {
    return NextResponse.json(
      { error: "Не удалось обновить пароль." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "Пароль успешно изменён. Войдите с новым паролем.",
  })
}
