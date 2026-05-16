/**
 * Telegram notifications: text, photo, document.
 * Used by contact form, demo form, and cabinet track uploads.
 */

import FormData from "form-data"

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID
const TELEGRAM_FETCH_TIMEOUT_MS = 20_000

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

export function isTelegramConfigured(): boolean {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID)
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

/**
 * Send a text message (HTML).
 */
export async function sendTelegramMessage(message: string): Promise<Response> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Telegram credentials are not configured")
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`
  const payload = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML" as const,
    disable_web_page_preview: true,
  }
  return fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  })
}

/**
 * Send a photo (buffer). filename used for extension (e.g. cover.jpg).
 */
export async function sendTelegramPhoto(
  imageBuffer: Buffer,
  filename: string,
  caption?: string
): Promise<Response> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Telegram credentials are not configured")
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`
  const form = new FormData()
  form.append("chat_id", TELEGRAM_CHAT_ID)
  form.append("photo", imageBuffer, filename)
  if (caption) form.append("caption", caption)
  return fetchWithTimeout(url, {
    method: "POST",
    body: form as unknown as BodyInit,
    headers: form.getHeaders(),
    cache: "no-store",
  })
}

/**
 * Send a document (e.g. WAV). filename e.g. track.wav.
 */
export async function sendTelegramDocument(
  fileBuffer: Buffer,
  filename: string,
  caption?: string
): Promise<Response> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Telegram credentials are not configured")
  }
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`
  const form = new FormData()
  form.append("chat_id", TELEGRAM_CHAT_ID)
  form.append("document", fileBuffer, filename)
  if (caption) form.append("caption", caption)
  return fetchWithTimeout(url, {
    method: "POST",
    body: form as unknown as BodyInit,
    headers: form.getHeaders(),
    cache: "no-store",
  })
}
