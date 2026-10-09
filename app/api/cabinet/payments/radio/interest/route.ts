import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { notifyStaffInBackground } from "@/lib/form-notifications"
import { escapeHtml } from "@/lib/telegram"

/**
 * Заглушка спроса на «Радио»: клиент нажимает «Оплатить»,
 * деньги не списываются, заявка уходит в уведомление staff.
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

  const message = [
    "<b>Интерес к услуге: Радио (заглушка оплаты)</b>",
    "",
    "<b>Деньги не списаны</b> - клиент нажал «Оплатить» для оценки спроса.",
    "",
    `<b>Аккаунт:</b> ${escapeHtml(user.email)}`,
    `<b>User ID:</b> ${escapeHtml(user.id)}`,
    `<b>Название:</b> ${escapeHtml(trackTitle)}`,
    trackLink ? `<b>Ссылка:</b> ${escapeHtml(trackLink)}` : null,
    comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}` : null,
    "",
    "#radio #интерес #спрос",
  ]
    .filter(Boolean)
    .join("\n")

  notifyStaffInBackground({
    telegramMessage: message,
    emailSubject: `[Parallax] Интерес к Радио: ${user.email}`,
    logContext: "payments/radio/interest",
  })

  return NextResponse.json({
    ok: true,
    stub: true,
    message:
      "Услуга скоро появится. Деньги не списаны - мы получили вашу заявку и свяжемся с вами.",
  })
}
