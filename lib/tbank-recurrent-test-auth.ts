import { NextRequest } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"

export function isTbankRecurrentTestEnabled(): boolean {
  return Boolean(process.env.TBANK_RECURRENT_TEST_SECRET?.trim())
}

export function verifyTbankRecurrentTestAccess(request: NextRequest): boolean {
  const secret = process.env.TBANK_RECURRENT_TEST_SECRET?.trim()
  if (!secret) return false

  const adminToken = getAdminToken(request)
  if (verifySession(adminToken)) return true

  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${secret}`) return true

  const querySecret = request.nextUrl.searchParams.get("secret")
  if (querySecret === secret) return true

  return false
}
