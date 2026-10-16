import { NextRequest, NextResponse } from "next/server"
import {
  extractLinkCodeFromTelegramText,
  linkCabinetTelegramByCode,
} from "@/lib/cabinet-telegram"
import {
  getTelegramUserBotWebhookSecret,
  isUserTelegramBotConfigured,
  sendTelegramUserMessage,
} from "@/lib/telegram-user"

export const runtime = "nodejs"

type TgUser = {
  id: number
  username?: string
  first_name?: string
}

type TgMessage = {
  message_id: number
  text?: string
  chat: { id: number; type: string }
  from?: TgUser
}

type TgUpdate = {
  update_id: number
  message?: TgMessage
}

async function reply(chatId: number, text: string) {
  try {
    await sendTelegramUserMessage(chatId, text)
  } catch (error) {
    console.error("[telegram/user-bot/webhook] reply failed:", error)
  }
}

export async function POST(request: NextRequest) {
  if (!isUserTelegramBotConfigured()) {
    return NextResponse.json({ ok: true })
  }

  const expectedSecret = getTelegramUserBotWebhookSecret()
  if (expectedSecret) {
    const got = request.headers.get("x-telegram-bot-api-secret-token") || ""
    if (got !== expectedSecret) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  let update: TgUpdate
  try {
    update = (await request.json()) as TgUpdate
  } catch {
    return NextResponse.json({ ok: true })
  }

  const message = update.message
  if (!message?.text || !message.chat?.id) {
    return NextResponse.json({ ok: true })
  }

  const chatId = message.chat.id
  const text = message.text.trim()
  const code = extractLinkCodeFromTelegramText(text)

  if (!code) {
    if (text.startsWith("/start")) {
      await reply(
        chatId,
        "Чтобы подключить уведомления, откройте настройки кабинета Parallax Music и нажмите «Подключить», затем отправьте сюда код привязки."
      )
    }
    return NextResponse.json({ ok: true })
  }

  const result = await linkCabinetTelegramByCode({
    code,
    chatId: String(chatId),
    username: message.from?.username ?? null,
  })

  if (result.ok) {
    await reply(
      chatId,
      "Готово! Telegram подключён к кабинету Parallax Music. Уведомления можно настроить в разделе «Настройки → Уведомления»."
    )
  } else if (result.reason === "expired") {
    await reply(chatId, "Код устарел. Создайте новый код в настройках кабинета.")
  } else if (result.reason === "not_found" || result.reason === "invalid_code") {
    await reply(chatId, "Код не найден. Проверьте код в настройках кабинета и попробуйте снова.")
  } else {
    await reply(chatId, "Не удалось привязать аккаунт. Попробуйте ещё раз чуть позже.")
  }

  return NextResponse.json({ ok: true })
}
