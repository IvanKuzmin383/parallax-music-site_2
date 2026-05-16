import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import ruMessages from '@/messages/ru.json'
import enMessages from '@/messages/en.json'
import { verifyTurnstileToken } from '@/lib/turnstile'

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

import { escapeHtml, sendTelegramMessage } from '@/lib/telegram'

function getContactSchema(t: Messages) {
  return z.object({
    name: z.string().min(2, t.validation.nameMin).max(100, t.validation.nameMax),
    email: z.string().email(t.validation.emailInvalid),
    projectType: z.string().min(2, t.validation.projectTypeMin).max(100, t.validation.projectTypeMax),
    message: z.string().min(10, t.validation.messageMin).max(1000, t.validation.messageMax),
    captchaToken: z.string().optional(),
  })
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
    
    // Build Telegram message
    const message =
      `<b>New Contact Message</b>\n` +
      `<b>Name:</b> ${escapeHtml(validatedData.name)}\n` +
      `<b>Email:</b> ${escapeHtml(validatedData.email)}\n` +
      `<b>Project Type:</b> ${escapeHtml(validatedData.projectType)}\n` +
      `<b>Message:</b> ${escapeHtml(validatedData.message)}\n\n` +
      `#контакт`

    // Send with one retry on 5xx/network error
    let telegramRes: Response | null = null
    try {
      telegramRes = await sendTelegramMessage(message)
      if (!telegramRes.ok && telegramRes.status >= 500) {
        telegramRes = await sendTelegramMessage(message)
      }
    } catch (err) {
      console.error('Telegram send error (network):', err)
    }

    if (!telegramRes || !telegramRes.ok) {
      let detail: unknown = undefined
      try {
        detail = telegramRes ? await telegramRes.json() : null
      } catch {}
      console.error('Telegram send failed', {
        status: telegramRes?.status,
        statusText: telegramRes?.statusText,
        detail,
      })
      return NextResponse.json(
        { success: false, error: t.errors.notificationFailed },
        { status: 502 },
      )
    }
    
    return NextResponse.json(
      { 
        success: true,
        message: t.api.contact.success
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false,
          error: t.errors.validationFailed,
          errors: error.errors 
        },
        { status: 400 }
      )
    }
    
    console.error('Contact form error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: t.errors.processingError
      },
      { status: 500 }
    )
  }
}

