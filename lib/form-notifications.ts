import {
  getNotifyEmails,
  isEmailConfigured,
  sendStaffNotificationEmail,
} from "@/lib/email"
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram"

const STAFF_NOTIFY_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.STAFF_NOTIFY_TIMEOUT_MS) || 5000, 1000),
  30_000
)

async function tryTelegram(message: string): Promise<boolean> {
  if (!isTelegramConfigured()) return false

  let telegramRes: Response | null = null
  try {
    telegramRes = await sendTelegramMessage(message)
    if (!telegramRes.ok && telegramRes.status >= 500) {
      telegramRes = await sendTelegramMessage(message)
    }
  } catch (err) {
    console.error("Telegram send error (network):", err)
    return false
  }

  if (!telegramRes?.ok) {
    let detail: unknown
    try {
      detail = await telegramRes.json()
    } catch {
      detail = null
    }
    console.error("Telegram send failed", {
      status: telegramRes?.status,
      statusText: telegramRes?.statusText,
      detail,
    })
    return false
  }

  return true
}

async function tryEmail(subject: string, html: string): Promise<boolean> {
  if (!isEmailConfigured()) return false

  const recipients = getNotifyEmails()
  if (recipients.length === 0) {
    console.error("[staff-notify] RESEND_NOTIFY_EMAIL is not set")
    return false
  }

  const result = await sendStaffNotificationEmail({
    to: recipients,
    subject,
    html,
  })

  if (!result.ok) {
    console.error("[staff-notify] Email send failed:", result.error)
  }

  return result.ok
}

/** Convert Telegram HTML (<b>, newlines) to simple email HTML. */
export function telegramHtmlToEmailHtml(message: string): string {
  const body = message
    .replace(/<b>/gi, "<strong>")
    .replace(/<\/b>/gi, "</strong>")
    .replace(/\n/g, "<br/>")
  return `<div style="font-family:sans-serif;line-height:1.5">${body}</div>`
}

export function isStaffNotificationConfigured(): boolean {
  return (
    isTelegramConfigured() ||
    (isEmailConfigured() && getNotifyEmails().length > 0)
  )
}

/** @deprecated Use isStaffNotificationConfigured */
export const isFormNotificationConfigured = isStaffNotificationConfigured

type DeliverResult = { ok: boolean; telegram: boolean; email: boolean; timedOut?: boolean }

async function deliverStaffNotification(params: {
  telegramMessage: string
  emailSubject: string
  emailHtml: string
}): Promise<DeliverResult> {
  const work = Promise.all([
    tryTelegram(params.telegramMessage),
    tryEmail(params.emailSubject, params.emailHtml),
  ]).then(([telegram, email]) => ({
    ok: telegram || email,
    telegram,
    email,
  }))

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<DeliverResult>((resolve) => {
    timeoutId = setTimeout(
      () => resolve({ ok: false, telegram: false, email: false, timedOut: true }),
      STAFF_NOTIFY_TIMEOUT_MS
    )
  })

  try {
    return await Promise.race([work, timeout])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

/** Telegram first, then Resend email; success if at least one channel delivers. */
export async function deliverFormNotification(params: {
  telegramMessage: string
  emailSubject: string
  emailHtml: string
}): Promise<DeliverResult> {
  return deliverStaffNotification(params)
}

/**
 * Staff alert (payments, subscriptions, registration, etc.).
 * Email HTML defaults from telegramMessage when omitted.
 */
export async function notifyStaff(params: {
  telegramMessage: string
  emailSubject: string
  emailHtml?: string
  logContext?: string
}): Promise<DeliverResult> {
  const emailHtml = params.emailHtml ?? telegramHtmlToEmailHtml(params.telegramMessage)
  const result = await deliverStaffNotification({
    telegramMessage: params.telegramMessage,
    emailSubject: params.emailSubject,
    emailHtml,
  })

  if (!result.ok && params.logContext) {
    if (result.timedOut) {
      console.error(`[${params.logContext}] Staff notification timed out after ${STAFF_NOTIFY_TIMEOUT_MS}ms`)
    } else {
      console.error(`[${params.logContext}] Staff notification failed (Telegram and email)`)
    }
  }

  return result
}

/**
 * Не блокирует HTTP-ответ: уведомление в фоне с общим таймаутом.
 */
export function notifyStaffInBackground(params: {
  telegramMessage: string
  emailSubject: string
  emailHtml?: string
  logContext?: string
}): void {
  void notifyStaff(params).catch((err) => {
    console.error(`[${params.logContext ?? "staff-notify"}] Background notify error`, err)
  })
}
