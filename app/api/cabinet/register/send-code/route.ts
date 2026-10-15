import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkCabinetRegisterEligibility } from "@/lib/cabinet-register-eligibility"
import {
  createEmailVerificationCode,
  EMAIL_VERIFICATION_TTL_MS,
} from "@/lib/email-verification"
import { isEmailConfigured, sendRegistrationVerificationEmail } from "@/lib/email"
import { verifyTurnstileToken } from "@/lib/turnstile"

const bodySchema = z.object({
  email: z.string().email("Неверный формат email"),
  captchaToken: z.string().optional(),
})

function getClientIp(request: NextRequest): string | null {
  const ipHeader = request.headers.get("x-forwarded-for") || ""
  return ipHeader.split(",")[0]?.trim() || null
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Ошибка валидации" },
      { status: 400 }
    )
  }

  const clientIp = getClientIp(request)
  const isHuman = await verifyTurnstileToken(parsed.data.captchaToken, clientIp)
  if (!isHuman) {
    return NextResponse.json({ error: "Подтвердите, что вы не робот" }, { status: 429 })
  }

  const email = parsed.data.email.trim().toLowerCase()
  const existing = await getCabinetUserByEmail(email, { includeDisabled: true })
  if (existing) {
    return NextResponse.json(
      { error: "Пользователь с таким email уже существует, используйте вход" },
      { status: 400 }
    )
  }

  const eligibility = await checkCabinetRegisterEligibility(email)
  if (!eligibility.ok) {
    return NextResponse.json(
      { error: eligibility.error, code: eligibility.code },
      { status: eligibility.status }
    )
  }

  if (!isEmailConfigured()) {
    // Локальная/тестовая среда без Resend - пропускаем отправку, регистрация примет любой 6-значный код? 
    // Нет: без письма регистрация всё равно потребует код. Разрешаем «dev»-код только если явно задано.
    if (process.env.EMAIL_VERIFICATION_DEV_BYPASS === "1") {
      const created = await createEmailVerificationCode(email)
      if (!created.ok) {
        return NextResponse.json(
          {
            error:
              created.error === "cooldown"
                ? `Подождите ${created.retryAfterSec ?? 60} сек. перед повторной отправкой`
                : "Слишком много запросов. Попробуйте позже.",
            retryAfterSec: created.retryAfterSec,
          },
          { status: 429 }
        )
      }
      console.warn(
        "[register/send-code] DEV bypass: code for",
        email,
        "=",
        created.code
      )
      return NextResponse.json({
        ok: true,
        ttlMinutes: created.ttlMinutes,
        devCode: created.code,
      })
    }
    return NextResponse.json(
      { error: "Отправка писем временно недоступна. Обратитесь в поддержку." },
      { status: 503 }
    )
  }

  const created = await createEmailVerificationCode(email)
  if (!created.ok) {
    return NextResponse.json(
      {
        error:
          created.error === "cooldown"
            ? `Подождите ${created.retryAfterSec ?? 60} сек. перед повторной отправкой`
            : "Слишком много запросов кода. Попробуйте через час.",
        retryAfterSec: created.retryAfterSec,
      },
      { status: 429 }
    )
  }

  const sent = await sendRegistrationVerificationEmail({
    to: email,
    code: created.code,
    ttlMinutes: created.ttlMinutes,
  })
  if (!sent.ok) {
    console.error("[register/send-code] send failed:", sent.error)
    return NextResponse.json(
      { error: "Не удалось отправить письмо. Попробуйте позже." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    ttlMinutes: Math.round(EMAIL_VERIFICATION_TTL_MS / 60000),
  })
}
