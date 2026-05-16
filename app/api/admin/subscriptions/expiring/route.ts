import { NextRequest, NextResponse } from "next/server"
import { format, differenceInCalendarDays } from "date-fns"
import { ru } from "date-fns/locale"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getAllCabinetUsers } from "@/lib/cabinet-users"
import { escapeHtml, isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram"

const DEFAULT_DAYS_AHEAD = 3

function getAutopayStatusLabel(user: {
  autopayEnabled?: boolean
  yookassaPaymentMethodId?: string
}): string {
  return user.autopayEnabled && user.yookassaPaymentMethodId ? "✅ подключено" : "❌ не подключено"
}

function isAuthorized(request: NextRequest): boolean {
  const url = new URL(request.url)
  const secretFromQuery = url.searchParams.get("secret")
  const secretEnv = process.env.SUBSCRIPTION_REMINDER_SECRET

  if (secretEnv && secretFromQuery && secretFromQuery === secretEnv) {
    return true
  }

  const token = getAdminToken(request)
  return verifySession(token)
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram is not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)" },
      { status: 500 }
    )
  }

  const url = new URL(request.url)
  const daysAheadParam = url.searchParams.get("days")
  const daysAhead = daysAheadParam ? Math.max(1, parseInt(daysAheadParam, 10) || DEFAULT_DAYS_AHEAD) : DEFAULT_DAYS_AHEAD

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const users = await getAllCabinetUsers()

    const expired: typeof users = []
    const expiringSoon: typeof users = []

    for (const user of users) {
      if (user.isDisabled) continue
      if (!user.subscriptionName || user.subscriptionName === "Fix" || !user.subscriptionExpiresAt) continue

      const expires = new Date(user.subscriptionExpiresAt)
      expires.setHours(0, 0, 0, 0)

      const diff = differenceInCalendarDays(expires, today)

      if (diff < 0) {
        expired.push(user)
      } else if (diff <= daysAhead) {
        expiringSoon.push(user)
      }
    }

    if (expired.length === 0 && expiringSoon.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "Нет подписок, которые истекли или истекают в ближайшие дни",
        expired: 0,
        expiringSoon: 0,
      })
    }

    let message =
      "<b>Напоминание по подпискам ЛК</b>\n" +
      `<b>Дата:</b> ${escapeHtml(
        format(today, "d MMMM yyyy", {
          locale: ru,
        })
      )}\n` +
      `<b>Порог:</b> ${daysAhead} дн.\n\n`

    if (expired.length > 0) {
      message += "<b>❌ Уже истекли:</b>\n"
      for (const user of expired) {
        const expiresStr = format(new Date(user.subscriptionExpiresAt!), "d MMM yyyy", { locale: ru })
        const autopayStatus = getAutopayStatusLabel(user)
        message += `• ${escapeHtml(user.email)} — до ${escapeHtml(expiresStr)} | автосписание: ${escapeHtml(
          autopayStatus
        )}\n`
      }
      message += "\n"
    }

    if (expiringSoon.length > 0) {
      message += "<b>⚠️ Истекают в ближайшие дни:</b>\n"
      for (const user of expiringSoon) {
        const expires = new Date(user.subscriptionExpiresAt!)
        const diff = differenceInCalendarDays(expires, today)
        const expiresStr = format(expires, "d MMM yyyy", { locale: ru })
        const autopayStatus = getAutopayStatusLabel(user)
        message += `• ${escapeHtml(user.email)} — до ${escapeHtml(
          expiresStr
        )} (осталось ${diff} дн.) | автосписание: ${escapeHtml(autopayStatus)}\n`
      }
      message += "\n#подписки"
    }

    let telegramRes: Response | null = null
    try {
      telegramRes = await sendTelegramMessage(message)
      if (!telegramRes.ok && telegramRes.status >= 500) {
        telegramRes = await sendTelegramMessage(message)
      }
    } catch (err) {
      console.error("Subscription reminder: Telegram send error (network):", err)
    }

    if (!telegramRes || !telegramRes.ok) {
      let detail: unknown = undefined
      try {
        detail = telegramRes ? await telegramRes.json() : null
      } catch {
        // ignore body
      }
      console.error("Subscription reminder: Telegram send failed", {
        status: telegramRes?.status,
        statusText: telegramRes?.statusText,
        detail,
      })
      return NextResponse.json(
        {
          ok: false,
          error: "Не удалось отправить уведомление в Telegram",
          expired: expired.length,
          expiringSoon: expiringSoon.length,
        },
        { status: 502 }
      )
    }

    return NextResponse.json(
      {
        ok: true,
        expired: expired.length,
        expiringSoon: expiringSoon.length,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Subscription reminder error:", error)
    return NextResponse.json(
      {
        ok: false,
        error: "Ошибка при формировании напоминания по подпискам",
      },
      { status: 500 }
    )
  }
}

