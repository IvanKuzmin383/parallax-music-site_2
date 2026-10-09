import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import {
  getCabinetToken,
  getCabinetSession,
} from "@/lib/cabinet-auth"
import {
  disableCabinetUserTotp,
  enableCabinetUserTotp,
  getCabinetUserByEmail,
  setCabinetUserTotpPending,
} from "@/lib/cabinet-users"
import {
  buildOtpAuthUrl,
  generateTotpSecret,
  verifyTotpCode,
} from "@/lib/cabinet-totp"

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  return NextResponse.json({
    enabled: Boolean(user.totpEnabled && user.totpSecret),
  })
}

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("setup") }),
  z.object({
    action: z.literal("confirm"),
    code: z.string().min(6).max(8),
  }),
  z.object({
    action: z.literal("disable"),
    password: z.string().min(1),
    code: z.string().min(6).max(8),
  }),
])

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

  const parsed = postSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  if (parsed.data.action === "setup") {
    if (user.totpEnabled && user.totpSecret) {
      return NextResponse.json({ error: "2FA уже включена" }, { status: 400 })
    }
    const secret = generateTotpSecret()
    await setCabinetUserTotpPending(user.id, secret)
    const otpauthUrl = buildOtpAuthUrl({ email: user.email, secret })
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`
    return NextResponse.json({
      secret,
      otpauthUrl,
      qrUrl,
    })
  }

  if (parsed.data.action === "confirm") {
    const pending = user.totpPendingSecret
    if (!pending) {
      return NextResponse.json(
        { error: "Сначала начните настройку 2FA" },
        { status: 400 }
      )
    }
    if (!verifyTotpCode(pending, parsed.data.code)) {
      return NextResponse.json({ error: "Неверный код подтверждения" }, { status: 400 })
    }
    await enableCabinetUserTotp(user.id, pending)
    return NextResponse.json({ ok: true, enabled: true })
  }

  // disable
  const passwordOk = await bcrypt.compare(parsed.data.password, user.passwordHash)
  if (!passwordOk) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 400 })
  }
  if (!user.totpEnabled || !user.totpSecret) {
    return NextResponse.json({ error: "2FA не включена" }, { status: 400 })
  }
  if (!verifyTotpCode(user.totpSecret, parsed.data.code)) {
    return NextResponse.json({ error: "Неверный код 2FA" }, { status: 400 })
  }
  await disableCabinetUserTotp(user.id)
  return NextResponse.json({ ok: true, enabled: false })
}
