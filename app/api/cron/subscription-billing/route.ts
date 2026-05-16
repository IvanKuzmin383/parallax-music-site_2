import { NextRequest, NextResponse } from "next/server"
import { runSubscriptionBilling } from "@/lib/subscription-billing"

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get("authorization")
  if (!auth || !auth.startsWith("Bearer ")) return false
  const token = auth.slice(7).trim()
  return token === secret
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const result = await runSubscriptionBilling()
  return NextResponse.json(result)
}
