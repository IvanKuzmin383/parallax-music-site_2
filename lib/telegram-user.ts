/**
 * Бот уведомлений для артистов (отдельно от staff TELEGRAM_BOT_TOKEN).
 * Env: TELEGRAM_USER_BOT_TOKEN, TELEGRAM_USER_BOT_USERNAME (без @).
 */

import { escapeHtml } from "@/lib/telegram"

const TELEGRAM_FETCH_TIMEOUT_MS = 20_000

function userBotToken(): string {
  return process.env.TELEGRAM_USER_BOT_TOKEN?.trim() || ""
}

export function getTelegramUserBotUsername(): string {
  return (process.env.TELEGRAM_USER_BOT_USERNAME?.trim() || "").replace(/^@/, "")
}

export function isUserTelegramBotConfigured(): boolean {
  return Boolean(userBotToken() && getTelegramUserBotUsername())
}

export function getTelegramUserBotWebhookSecret(): string {
  return process.env.TELEGRAM_USER_BOT_WEBHOOK_SECRET?.trim() || ""
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TELEGRAM_FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

export function buildTelegramUserDeepLink(startPayload: string): string | null {
  const username = getTelegramUserBotUsername()
  if (!username) return null
  const payload = startPayload.trim()
  if (!payload) return `https://t.me/${username}`
  return `https://t.me/${username}?start=${encodeURIComponent(payload)}`
}

/** Отправка HTML-сообщения пользователю по chat_id. */
export async function sendTelegramUserMessage(
  chatId: string | number,
  message: string
): Promise<Response> {
  const token = userBotToken()
  if (!token) {
    throw new Error("TELEGRAM_USER_BOT_TOKEN is not configured")
  }
  const url = `https://api.telegram.org/bot${token}/sendMessage`
  return fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML" as const,
      disable_web_page_preview: true,
    }),
    cache: "no-store",
  })
}

export { escapeHtml }
