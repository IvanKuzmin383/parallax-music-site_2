import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { notifyStaffInBackground } from "@/lib/form-notifications"
import { formatServicePriceCardLabel, getResolvedServicePrice } from "@/lib/service-prices"
import { escapeHtml } from "@/lib/telegram"

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Предварительная заявка на "Радио": деньги не списываются,
 * заявка уходит в уведомление staff.
 */
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
  }

  const raw = body as Record<string, unknown>
  const trackTitle = typeof raw.trackTitle === "string" ? raw.trackTitle.trim() : ""
  const trackLink = typeof raw.trackLink === "string" ? raw.trackLink.trim() : ""
  const comment = typeof raw.comment === "string" ? raw.comment.trim() : ""

  if (!trackTitle) {
    return NextResponse.json({ error: "Укажите название релиза или проекта" }, { status: 400 })
  }
  if (trackLink && !isHttpUrl(trackLink)) {
    return NextResponse.json(
      { error: "Укажите корректную ссылку на трек (http или https)" },
      { status: 400 }
    )
  }

  const radioPrice = formatServicePriceCardLabel(await getResolvedServicePrice("radio"))
  const message = [
    "<b>Заявка на услугу: Радио</b>",
    "",
    "<b>Деньги не списаны</b> - предварительная заявка на размещение в радио-витрине.",
    "",
    `<b>Аккаунт:</b> ${escapeHtml(user.email)}`,
    `<b>User ID:</b> ${escapeHtml(user.id)}`,
    `<b>Ориентир цены:</b> ${escapeHtml(radioPrice)} за трек`,
    `<b>Название:</b> ${escapeHtml(trackTitle)}`,
    trackLink ? `<b>Ссылка:</b> ${escapeHtml(trackLink)}` : null,
    comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}` : null,
    "",
    "#radio #заявка #спрос",
  ]
    .filter(Boolean)
    .join("\n")

  notifyStaffInBackground({
    telegramMessage: message,
    emailSubject: `[Parallax] Заявка Радио: ${user.email}`,
    logContext: "payments/radio/interest",
  })

  return NextResponse.json({
    ok: true,
    stub: true,
    message:
      "Заявка отправлена. Мы свяжемся с вами для уточнения деталей. Оплата не списана.",
  })
}
