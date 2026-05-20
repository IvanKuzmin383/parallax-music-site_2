import {
  getNotifyEmails,
  isEmailConfigured,
  sendStaffNotificationEmail,
} from "@/lib/email"
import { isTelegramConfigured, sendTelegramMessage } from "@/lib/telegram"

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

async function deliverStaffNotification(params: {
  telegramMessage: string
  emailSubject: string
  emailHtml: string
}): Promise<{ ok: boolean; telegram: boolean; email: boolean }> {
  const telegram = await tryTelegram(params.telegramMessage)
  const email = await tryEmail(params.emailSubject, params.emailHtml)
  return { ok: telegram || email, telegram, email }
}

/** Telegram first, then Resend email; success if at least one channel delivers. */
export async function deliverFormNotification(params: {
  telegramMessage: string
  emailSubject: string
  emailHtml: string
}): Promise<{ ok: boolean; telegram: boolean; email: boolean }> {
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
}): Promise<{ ok: boolean; telegram: boolean; email: boolean }> {
  const emailHtml = params.emailHtml ?? telegramHtmlToEmailHtml(params.telegramMessage)
  const result = await deliverStaffNotification({
    telegramMessage: params.telegramMessage,
    emailSubject: params.emailSubject,
    emailHtml,
  })

  if (!result.ok && params.logContext) {
    console.error(`[${params.logContext}] Staff notification failed (Telegram and email)`)
  }

  return result
}
