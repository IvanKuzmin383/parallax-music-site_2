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

// In-memory rate limit storage for dev
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_MS = 15_000

import { escapeHtml, sendTelegramMessage } from '@/lib/telegram'

function getDemoSubmissionSchema(t: Messages) {
  return z.object({
    artistName: z.string().min(2, t.validation.artistNameMin).max(100, t.validation.artistNameMax),
    email: z.string().email(t.validation.emailInvalid),
    trackName: z.string().min(2, t.validation.trackNameMin).max(100, t.validation.trackNameMax),
    genre: z.enum(['Hip-Hop', 'R&B', 'Pop', 'Electronic', 'Indie Rock', 'Alternative Rock', 'Other'], {
      errorMap: () => ({ message: t.validation.genreInvalid }),
    }),
    demoLink: z.string().url(t.validation.urlInvalid),
    description: z.string().max(500, t.validation.descriptionMax).optional(),
    captchaToken: z.string().optional(),
  })
}

export async function POST(request: NextRequest) {
  const locale = (request.headers.get('x-locale') || 'ru') as Locale
  const t = getMessages(locale)
  
  try {
    // Basic dev-only rate limiting per IP
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
    const demoSubmissionSchema = getDemoSubmissionSchema(t)
    const { captchaToken: _ignoredCaptcha, ...validatedData } = demoSubmissionSchema.parse(body)
    
    // Prepare Telegram message with HTML escaping
    const message =
      `<b>New Demo Submission</b>\n` +
      `<b>Artist:</b> ${escapeHtml(validatedData.artistName)}\n` +
      `<b>Email:</b> ${escapeHtml(validatedData.email)}\n` +
      `<b>Track:</b> ${escapeHtml(validatedData.trackName)}\n` +
      `<b>Genre:</b> ${escapeHtml(validatedData.genre)}\n` +
      `<b>Link:</b> ${escapeHtml(validatedData.demoLink)}\n` +
      (validatedData.description ? `<b>Description:</b> ${escapeHtml(validatedData.description)}` : '') +
      `\n\n#демо`

    // Attempt send, with one retry on 5xx/network failures
    let telegramRes: Response | null = null
    try {
      telegramRes = await sendTelegramMessage(message)
      if (!telegramRes.ok && telegramRes.status >= 500) {
        // retry once
        telegramRes = await sendTelegramMessage(message)
      }
    } catch (err) {
      console.error('Telegram send error (network):', err)
    }

    if (!telegramRes || !telegramRes.ok) {
      let detail: unknown = undefined
      try {
        detail = telegramRes ? await telegramRes.json() : null
      } catch {
        // ignore body parse
      }
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
        message: t.api.demo.success
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
    
    console.error('Demo submission error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: t.errors.demoProcessingError
      },
      { status: 500 }
    )
  }
}

