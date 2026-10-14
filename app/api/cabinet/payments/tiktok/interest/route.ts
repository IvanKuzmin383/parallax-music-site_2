import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { notifyStaffInBackground } from "@/lib/form-notifications"
import { escapeHtml } from "@/lib/telegram"

/**
 * Заявка на «TikTok / Блогеры»: деньги не списываются.
 * Клиент указывает бюджет - подбор размещения обсуждается отдельно.
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
  const budget = typeof raw.budget === "string" ? raw.budget.trim() : ""
  const comment = typeof raw.comment === "string" ? raw.comment.trim() : ""

  if (!trackTitle) {
    return NextResponse.json({ error: "Укажите название релиза или проекта" }, { status: 400 })
  }
  if (!budget) {
    return NextResponse.json({ error: "Укажите бюджет" }, { status: 400 })
  }

  const message = [
    "<b>Заявка на услугу: TikTok / Блогеры</b>",
    "",
    "<b>Деньги не списаны</b> - заявка с бюджетом для подбора размещения.",
    "",
    `<b>Аккаунт:</b> ${escapeHtml(user.email)}`,
    `<b>User ID:</b> ${escapeHtml(user.id)}`,
    `<b>Название:</b> ${escapeHtml(trackTitle)}`,
    trackLink ? `<b>Ссылка:</b> ${escapeHtml(trackLink)}` : null,
    `<b>Бюджет:</b> ${escapeHtml(budget)}`,
    comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}` : null,
    "",
    "#tiktok #блогеры #заявка #спрос",
  ]
    .filter(Boolean)
    .join("\n")

  notifyStaffInBackground({
    telegramMessage: message,
    emailSubject: `[Parallax] Заявка TikTok / Блогеры: ${user.email}`,
    logContext: "payments/tiktok/interest",
  })

  return NextResponse.json({
    ok: true,
    stub: true,
    message:
      "Заявку получили. Деньги не списаны - подберём варианты под ваш бюджет и свяжемся с вами.",
  })
}
