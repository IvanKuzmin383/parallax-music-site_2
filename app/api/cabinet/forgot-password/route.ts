import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { createPasswordResetToken, deleteExpiredTokens } from "@/lib/password-reset-tokens"
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { escapeHtml } from "@/lib/telegram"
import { notifyStaffInBackground } from "@/lib/form-notifications"

const forgotSchema = z.object({
  email: z.string().email("Неверный формат email"),
  captchaToken: z.string().optional(),
})

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown"
  return "unknown"
}

export async function POST(request: NextRequest) {
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "Восстановление пароля временно недоступно. Обратитесь в поддержку." },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = forgotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверный формат email", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const ip = getClientIp(request)
  const isHuman = await verifyTurnstileToken(parsed.data.captchaToken, ip)
  if (!isHuman) {
    return NextResponse.json(
      { error: "Подтвердите, что вы не робот" },
      { status: 429 }
    )
  }

  const user = await getCabinetUserByEmail(parsed.data.email)
  if (!user) {
    return NextResponse.json(
      {
        success: false,
        notRegistered: true,
        error: "Пользователь с таким email не зарегистрирован. Зарегистрируйтесь, чтобы войти в кабинет.",
      },
      { status: 404 }
    )
  }

  await deleteExpiredTokens()
  const token = await createPasswordResetToken(user.id, user.email)
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  const resetLink = `${baseUrl}/cabinet/reset-password?token=${encodeURIComponent(token)}`

  const result = await sendPasswordResetEmail(user.email, resetLink)
  if (!result.ok) {
    console.error("[cabinet/forgot-password] Email send failed:", result.error)
    return NextResponse.json(
      { error: "Не удалось отправить письмо. Попробуйте позже." },
      { status: 500 }
    )
  }

  try {
    const messageLines = [
      "<b>Запрос сброса пароля</b>",
      "",
      `<b>Email:</b> ${escapeHtml(user.email)}`,
      user.artistName ? `<b>Артист:</b> ${escapeHtml(user.artistName)}` : null,
      "",
      "#сброс_пароля #кабинет",
    ].filter(Boolean) as string[]

    notifyStaffInBackground({
      telegramMessage: messageLines.join("\n"),
      emailSubject: `[Parallax] Сброс пароля: ${user.email}`,
      logContext: "cabinet/forgot-password",
    })
  } catch (err) {
    console.error("[cabinet/forgot-password] Staff notification error", err)
  }

  return NextResponse.json({
    success: true,
    message: "Если аккаунт с таким email существует, на него отправлена ссылка для восстановления пароля.",
  })
}
