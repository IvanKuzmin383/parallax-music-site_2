import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { notifyStaffInBackground } from "@/lib/form-notifications"
import { LYRICS_SYNC_PRICE_LABEL } from "@/lib/lyrics-sync-pricing"
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
 * Предварительная заявка на «Синхронизацию текста»: деньги не списываются,
 * заявка уходит в уведомление staff (фиксированный тариф не настроен).
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
  const trackLink = typeof raw.trackLink === "string" ? raw.trackLink.trim() : ""
  const fileUrl = typeof raw.fileUrl === "string" ? raw.fileUrl.trim() : ""
  const audioUrl = trackLink || fileUrl
  const lyricsRaw = typeof raw.lyricsText === "string" ? raw.lyricsText : ""
  const lyricsText = lyricsRaw.replace(/\r\n/g, "\n").trim()
  const comment = typeof raw.comment === "string" ? raw.comment.replace(/\r\n/g, "\n").trim() : ""

  if (!audioUrl) {
    return NextResponse.json(
      { error: "Укажите ссылку на финальную версию трека" },
      { status: 400 }
    )
  }
  if (!isHttpUrl(audioUrl)) {
    return NextResponse.json(
      { error: "Укажите корректную ссылку на трек (http или https)" },
      { status: 400 }
    )
  }
  if (!lyricsText) {
    return NextResponse.json(
      { error: "Укажите полный текст песни в порядке исполнения" },
      { status: 400 }
    )
  }

  const message = [
    "<b>Заявка на услугу: Синхронизация текста</b>",
    "",
    "<b>Деньги не списаны</b> - предварительная заявка (тариф по запросу).",
    "",
    `<b>Аккаунт:</b> ${escapeHtml(user.email)}`,
    `<b>User ID:</b> ${escapeHtml(user.id)}`,
    `<b>Ориентир цены:</b> ${escapeHtml(LYRICS_SYNC_PRICE_LABEL)}`,
    `<b>Финальная запись:</b> ${escapeHtml(audioUrl)}`,
    "",
    "<b>Текст песни:</b>",
    `<pre>${escapeHtml(lyricsText)}</pre>`,
    comment ? "" : null,
    comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}` : null,
    "",
    "#lyrics-sync #синхронизация #заявка #спрос",
  ]
    .filter((line) => line !== null)
    .join("\n")

  notifyStaffInBackground({
    telegramMessage: message,
    emailSubject: `[Parallax] Заявка Синхронизация текста: ${user.email}`,
    logContext: "payments/lyrics-sync/interest",
  })

  return NextResponse.json({
    ok: true,
    stub: true,
    message:
      "Заявка отправлена. Мы свяжемся с вами для уточнения деталей. Оплата не списана.",
  })
}
