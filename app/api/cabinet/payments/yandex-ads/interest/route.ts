import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { notifyStaffInBackground } from "@/lib/form-notifications"
import { escapeHtml } from "@/lib/telegram"
import {
  YANDEX_ADS_PRICE_LABEL,
  getYandexAdsObject,
  isYandexAdsObjectId,
} from "@/lib/yandex-ads-campaign"

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * Заявка на продвижение в Яндекс Директ: деньги не списываются.
 * Точная стоимость работы и рекламный бюджет согласуются перед оплатой.
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
  const objectRaw =
    typeof raw.promotionObject === "string" ? raw.promotionObject.trim() : ""
  const budgetRaw = typeof raw.budget === "string" ? raw.budget.trim() : ""
  const comment = typeof raw.comment === "string" ? raw.comment.trim() : ""
  const contactValue =
    typeof raw.contactValue === "string" ? raw.contactValue.trim() : ""

  if (!trackTitle || trackTitle.length > 150) {
    return NextResponse.json(
      { error: "Заполните название проекта, ссылку и контакт для связи" },
      { status: 400 }
    )
  }
  if (!trackLink || !isHttpUrl(trackLink)) {
    return NextResponse.json(
      { error: "Укажите корректную ссылку, начинающуюся с https:// или http://" },
      { status: 400 }
    )
  }
  if (!isYandexAdsObjectId(objectRaw)) {
    return NextResponse.json({ error: "Выберите объект продвижения" }, { status: 400 })
  }
  if (comment.length > 2000) {
    return NextResponse.json({ error: "Комментарий слишком длинный" }, { status: 400 })
  }
  if (contactValue.length > 200) {
    return NextResponse.json({ error: "Контакт слишком длинный" }, { status: 400 })
  }

  let budgetLabel = "Обсудим отдельно"
  if (budgetRaw) {
    const budgetNum = Number(budgetRaw.replace(/\s/g, "").replace(",", "."))
    if (!Number.isFinite(budgetNum) || !Number.isInteger(budgetNum) || budgetNum <= 0) {
      return NextResponse.json(
        {
          error:
            "Укажите рекламный бюджет целым положительным числом или оставьте поле пустым",
        },
        { status: 400 }
      )
    }
    budgetLabel = `${budgetNum.toLocaleString("ru-RU")} ₽`
  }

  const object = getYandexAdsObject(objectRaw)
  const contactLine = contactValue || user.email

  const message = [
    "<b>Заявка на услугу: Продвижение в Яндекс Директ</b>",
    "",
    "<b>Деньги не списаны</b> - заявка для согласования условий перед оплатой.",
    "",
    `<b>Аккаунт:</b> ${escapeHtml(user.email)}`,
    `<b>User ID:</b> ${escapeHtml(user.id)}`,
    `<b>Название:</b> ${escapeHtml(trackTitle)}`,
    `<b>Ссылка:</b> ${escapeHtml(trackLink)}`,
    `<b>Объект:</b> ${escapeHtml(object.title)} (${escapeHtml(object.id)})`,
    `<b>Рекламный бюджет (пожелание):</b> ${escapeHtml(budgetLabel)}`,
    `<b>Контакт:</b> ${escapeHtml(contactLine)}`,
    comment ? `<b>Комментарий:</b> ${escapeHtml(comment)}` : null,
    "",
    `<b>Работа Parallax:</b> ${escapeHtml(YANDEX_ADS_PRICE_LABEL)} (точная сумма до оплаты)`,
    "",
    "#yandex #директ #заявка #спрос",
  ]
    .filter(Boolean)
    .join("\n")

  notifyStaffInBackground({
    telegramMessage: message,
    emailSubject: `[Parallax] Заявка Яндекс Директ: ${user.email}`,
    logContext: "payments/yandex-ads/interest",
  })

  return NextResponse.json({
    ok: true,
    stub: true,
    message:
      "Заявку получили. Деньги не списаны - точную стоимость и условия согласуем перед оплатой.",
  })
}
