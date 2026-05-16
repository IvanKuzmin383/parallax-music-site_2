import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import {
  getCabinetUserAuthStatus,
  createCabinetSession,
  destroyCabinetSession,
  getCabinetToken,
  checkCabinetLoginRateLimit,
  CABINET_SESSION_COOKIE,
} from "@/lib/cabinet-auth"
import { verifyTurnstileToken } from "@/lib/turnstile"
import { isTurnstileEnabledServer } from "@/lib/turnstile-config"
import { CABINET_ACCOUNT_BLOCKED_LOGIN_MESSAGE } from "@/lib/cabinet-account-messages"

const loginSchema = z.object({
  email: z.string().email("Неверный формат email"),
  password: z.string().min(1, "Пароль обязателен"),
  captchaToken: z.string().optional(),
})

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge,
    path: "/",
  }
}

// После N неудачных логинов за окно времени начинаем требовать капчу
const LOGIN_CAPTCHA_WINDOW_MS = 60_000
const LOGIN_CAPTCHA_THRESHOLD = 3
const loginFailedAttemptsMap = new Map<string, number[]>()

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown"
  return "unknown"
}

function registerFailedLogin(ip: string) {
  const now = Date.now()
  const cutoff = now - LOGIN_CAPTCHA_WINDOW_MS
  let attempts = loginFailedAttemptsMap.get(ip) ?? []
  attempts = attempts.filter((t) => t > cutoff)
  attempts.push(now)
  loginFailedAttemptsMap.set(ip, attempts)
}

function shouldRequireCaptcha(ip: string): boolean {
  const now = Date.now()
  const cutoff = now - LOGIN_CAPTCHA_WINDOW_MS
  const attempts = (loginFailedAttemptsMap.get(ip) ?? []).filter((t) => t > cutoff)
  loginFailedAttemptsMap.set(ip, attempts)
  return attempts.length >= LOGIN_CAPTCHA_THRESHOLD
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!checkCabinetLoginRateLimit(request)) {
    return NextResponse.json(
      { error: "Слишком много попыток входа. Попробуйте позже." },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Неверные данные", errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const requireCaptcha = isTurnstileEnabledServer() && shouldRequireCaptcha(ip)
  if (requireCaptcha) {
    const isHuman = await verifyTurnstileToken(parsed.data.captchaToken, ip)
    if (!isHuman) {
      return NextResponse.json(
        { error: "Подтвердите, что вы не робот" },
        { status: 429 }
      )
    }
  }

  const authStatus = await getCabinetUserAuthStatus(parsed.data.email, parsed.data.password)
  if (authStatus !== "ok") {
    registerFailedLogin(ip)
    if (authStatus === "blocked") {
      return NextResponse.json({ error: CABINET_ACCOUNT_BLOCKED_LOGIN_MESSAGE }, { status: 403 })
    }
    return NextResponse.json(
      { error: "Неверный email или пароль" },
      { status: 401 }
    )
  }

  const token = createCabinetSession(parsed.data.email)
  const response = NextResponse.json({ success: true }, { status: 200 })
  response.cookies.set(CABINET_SESSION_COOKIE, token, sessionCookieOptions(86400)) // 24h
  return response
}

export async function DELETE(request: NextRequest) {
  const token = getCabinetToken(request)
  destroyCabinetSession(token)

  const response = NextResponse.json({ success: true }, { status: 200 })
  response.cookies.set(CABINET_SESSION_COOKIE, "", sessionCookieOptions(0))
  return response
}
