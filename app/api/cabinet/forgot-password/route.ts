import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { createPasswordResetToken, deleteExpiredTokens } from "@/lib/password-reset-tokens"
import { isEmailConfigured, sendPasswordResetEmail } from "@/lib/email"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { escapeHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram"

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

  if (isTelegramConfigured()) {
    try {
      const messageLines = [
        "<b>Запрос сброса пароля</b>",
        "",
        `<b>Email:</b> ${escapeHtml(user.email)}`,
        user.artistName ? `<b>Артист:</b> ${escapeHtml(user.artistName)}` : null,
        "",
        "#сброс_пароля #кабинет",
      ].filter(Boolean) as string[]
      const message = messageLines.join("\n")
      const sendWithRetry = async (fn: () => Promise<Response>) => {
        let res = await fn()
        if (!res.ok && res.status >= 500) res = await fn()
        return res
      }
      const tgRes = await sendWithRetry(() => sendTelegramMessage(message))
      if (!tgRes.ok) {
        console.error("[cabinet/forgot-password] Telegram notification failed", tgRes.status, await tgRes.text())
      }
    } catch (err) {
      console.error("[cabinet/forgot-password] Telegram notification error", err)
    }
  }

  return NextResponse.json({
    success: true,
    message: "Если аккаунт с таким email существует, на него отправлена ссылка для восстановления пароля.",
  })
}
