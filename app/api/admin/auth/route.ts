import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  verifyAdminPassword,
  createSession,
  destroySession,
  checkLoginRateLimit,
  getAdminToken,
  ADMIN_SESSION_COOKIE,
} from '@/lib/auth'

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required').max(256, 'Password too long'),
})

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown'
  return 'unknown'
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge,
    path: '/',
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  if (!checkLoginRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Too many login attempts. Try again later.' },
      { status: 429 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', errors: parsed.error.flatten() },
      { status: 400 }
    )
  }

  if (!verifyAdminPassword(parsed.data.password)) {
    return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
  }

  const token = createSession()
  const response = NextResponse.json({ success: true }, { status: 200 })
  response.cookies.set(ADMIN_SESSION_COOKIE, token, sessionCookieOptions(86400)) // 24h
  return response
}

export async function DELETE(request: NextRequest) {
  const token = getAdminToken(request)
  destroySession(token)

  const response = NextResponse.json({ success: true }, { status: 200 })
  response.cookies.set(ADMIN_SESSION_COOKIE, '', sessionCookieOptions(0))
  return response
}
