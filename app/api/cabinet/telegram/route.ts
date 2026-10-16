import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import {
  createCabinetTelegramLinkCode,
  getCabinetTelegramStatus,
  unlinkCabinetTelegram,
  updateCabinetTelegramPrefs,
  type CabinetTelegramNotifyPrefs,
} from "@/lib/cabinet-telegram"

async function requireUser(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return null
  const user = await getCabinetUserByEmail(session.email)
  if (!user) return null
  return user
}

/** Статус привязки + prefs. */
export async function GET(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const status = await getCabinetTelegramStatus(user.id)
    return NextResponse.json(status)
  } catch (error) {
    console.error("[cabinet/telegram] GET error:", error)
    return NextResponse.json({ error: "Не удалось загрузить настройки Telegram" }, { status: 500 })
  }
}

/** Создать код привязки. */
export async function POST(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const link = await createCabinetTelegramLinkCode(user.id)
    return NextResponse.json(link)
  } catch (error) {
    if (error instanceof Error && error.message === "USER_BOT_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Telegram-бот уведомлений ещё не настроен. Обратитесь в поддержку." },
        { status: 503 }
      )
    }
    console.error("[cabinet/telegram] POST error:", error)
    return NextResponse.json({ error: "Не удалось создать код привязки" }, { status: 500 })
  }
}

/** Обновить prefs (тумблеры). */
export async function PATCH(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const patch: Partial<CabinetTelegramNotifyPrefs> = {}
  for (const key of ["enabled", "releases", "payments", "withdrawals", "royalty"] as const) {
    if (typeof raw[key] === "boolean") patch[key] = raw[key]
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Нет полей для обновления" }, { status: 400 })
  }

  try {
    const prefs = await updateCabinetTelegramPrefs(user.id, patch)
    return NextResponse.json({ prefs })
  } catch (error) {
    console.error("[cabinet/telegram] PATCH error:", error)
    return NextResponse.json({ error: "Не удалось сохранить настройки" }, { status: 500 })
  }
}

/** Отвязать Telegram. */
export async function DELETE(request: NextRequest) {
  const user = await requireUser(request)
  if (!user) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    await unlinkCabinetTelegram(user.id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[cabinet/telegram] DELETE error:", error)
    return NextResponse.json({ error: "Не удалось отвязать Telegram" }, { status: 500 })
  }
}
