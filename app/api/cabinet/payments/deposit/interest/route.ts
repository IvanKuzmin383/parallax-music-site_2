import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { notifyStaffInBackground } from "@/lib/form-notifications"
import { escapeHtml } from "@/lib/telegram"

/**
 * Сбор интереса к «Депонированию»: деньги не списываются.
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

  let trackTitle = ""
  let trackLink = ""
  let comment = ""
  try {
    const body = (await request.json()) as Record<string, unknown>
    trackTitle = typeof body.trackTitle === "string" ? body.trackTitle.trim() : ""
    trackLink = typeof body.trackLink === "string" ? body.trackLink.trim() : ""
    comment = typeof body.comment === "string" ? body.comment.trim() : ""
  } catch {
    // тело необязательно для кнопки интереса
  }

  const message = [
    "<b>Интерес к услуге: Депонирование</b>",
    "",
    "<b>Деньги не списаны</b> - клиент нажал «Хочу задепонировать».",
    "",
    `<b>Аккаунт:</b> ${escapeHtml(user.email)}`,
    `<b>User ID:</b> ${escapeHtml(user.id)}`,
    trackTitle ? `<b>Название:</b> ${escapeHtml(trackTitle)}` : null,
    trackLink ? `<b>Ссылка:</b> ${escapeHtml(trackLink)}` : null,
    comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}` : null,
    "",
    "#deposit #депонирование #интерес #спрос",
  ]
    .filter(Boolean)
    .join("\n")

  notifyStaffInBackground({
    telegramMessage: message,
    emailSubject: `[Parallax] Интерес к Депонированию: ${user.email}`,
    logContext: "payments/deposit/interest",
  })

  return NextResponse.json({
    ok: true,
    stub: true,
    message:
      "Спасибо! Мы получили ваш интерес к депонированию и свяжемся, когда услуга станет доступна. Деньги не списаны.",
  })
}
