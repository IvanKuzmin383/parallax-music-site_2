import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import ruMessages from '@/messages/ru.json'
import enMessages from '@/messages/en.json'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { escapeHtml } from '@/lib/telegram'
import {
  deliverFormNotification,
  isFormNotificationConfigured,
} from '@/lib/form-notifications'

type Locale = 'ru' | 'en'
type Messages = typeof ruMessages
const messages: Record<Locale, Messages> = {
  ru: ruMessages,
  en: enMessages as Messages,
}

function getMessages(locale: string): Messages {
  return messages[locale as Locale] || messages.ru
}

// Dev-only in-memory rate limit
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 15_000

function getContactSchema(t: Messages) {
  return z.object({
    name: z.string().min(2, t.validation.nameMin).max(100, t.validation.nameMax),
    email: z.string().email(t.validation.emailInvalid),
    projectType: z.string().min(2, t.validation.projectTypeMin).max(100, t.validation.projectTypeMax),
    message: z.string().min(10, t.validation.messageMin).max(1000, t.validation.messageMax),
    captchaToken: z.string().optional(),
  })
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(request: NextRequest) {
  const locale = (request.headers.get('x-locale') || 'ru') as Locale
  const t = getMessages(locale)

  try {
    // Basic rate limit for dev
    if (process.env.NODE_ENV !== 'production') {
      const ipHeader = request.headers.get('x-forwarded-for') || ''
      const clientIp = ipHeader.split(',')[0]?.trim() || 'unknown'
      const now = Date.now()
      const last = rateLimitMap.get(clientIp) || 0
      if (now - last < RATE_LIMIT_MS) {
        return NextResponse.json(
          { success: false, error: t.errors.tooManyRequests },
          { status: 429 },
        )
      }
      rateLimitMap.set(clientIp, now)
    }

    if (!isFormNotificationConfigured()) {
      console.error('[contact] No notification channel configured (Telegram or Resend)')
      return NextResponse.json(
        { success: false, error: t.errors.notificationFailed },
        { status: 503 },
      )
    }

    const ipHeader = request.headers.get('x-forwarded-for') || ''
    const clientIp = ipHeader.split(',')[0]?.trim() || null

    const body = await request.json()

    // Verify Turnstile token before validating data
    const isHuman = await verifyTurnstileToken(body.captchaToken, clientIp)
    if (!isHuman) {
      return NextResponse.json(
        { success: false, error: t.errors.tooManyRequests },
        { status: 429 },
      )
    }

    // Валидация данных
    const contactSchema = getContactSchema(t)
    const { captchaToken: _ignoredCaptcha, ...validatedData } = contactSchema.parse(body)

    const telegramMessage =
      `<b>New Contact Message</b>\n` +
      `<b>Name:</b> ${escapeHtml(validatedData.name)}\n` +
      `<b>Email:</b> ${escapeHtml(validatedData.email)}\n` +
      `<b>Project Type:</b> ${escapeHtml(validatedData.projectType)}\n` +
      `<b>Message:</b> ${escapeHtml(validatedData.message)}\n\n` +
      `#контакт`

    const emailHtml = `
      <h2>Новое сообщение с формы контакта</h2>
      <p><b>Имя:</b> ${escapeHtmlText(validatedData.name)}</p>
      <p><b>Email:</b> ${escapeHtmlText(validatedData.email)}</p>
      <p><b>Тип проекта:</b> ${escapeHtmlText(validatedData.projectType)}</p>
      <p><b>Сообщение:</b></p>
      <p>${escapeHtmlText(validatedData.message).replace(/\n/g, '<br/>')}</p>
      <p><i>#контакт</i></p>
    `

    const delivered = await deliverFormNotification({
      telegramMessage,
      emailSubject: `[Parallax] Контакт: ${validatedData.name}`,
      emailHtml,
    })

    if (!delivered.ok) {
      return NextResponse.json(
        { success: false, error: t.errors.notificationFailed },
        { status: 502 },
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: t.api.contact.success,
      },
      { status: 200 },
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: t.errors.validationFailed,
          errors: error.errors,
        },
        { status: 400 },
      )
    }

    console.error('Contact form error:', error)

    return NextResponse.json(
      {
        success: false,
        error: t.errors.processingError,
      },
      { status: 500 },
    )
  }
}
