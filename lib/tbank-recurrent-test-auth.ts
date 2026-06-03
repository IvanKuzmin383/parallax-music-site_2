import { NextRequest } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"

export function getTbankLkTestSecret(): string | null {
  return (
    process.env.TBANK_LK_TEST_SECRET?.trim() ||
    process.env.TBANK_RECURRENT_TEST_SECRET?.trim() ||
    null
  )
}

export function isTbankRecurrentTestEnabled(): boolean {
  return Boolean(getTbankLkTestSecret())
}

export function verifyTbankRecurrentTestAccess(request: NextRequest): boolean {
  const secret = getTbankLkTestSecret()
  if (!secret) return false

  const adminToken = getAdminToken(request)
  if (verifySession(adminToken)) return true

  const authHeader = request.headers.get("authorization")
  if (authHeader === `Bearer ${secret}`) return true

  const querySecret = request.nextUrl.searchParams.get("secret")
  if (querySecret === secret) return true

  return false
}
