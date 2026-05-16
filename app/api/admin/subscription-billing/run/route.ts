import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { runSubscriptionBilling } from "@/lib/subscription-billing"
import {
  createSubscriptionBillingRunLog,
  finalizeSubscriptionBillingRunLog,
  listSubscriptionBillingRuns,
  markSubscriptionBillingRunFailed,
} from "@/lib/subscription-billing-runs"

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const limitRaw = new URL(request.url).searchParams.get("limit")
  const limit = limitRaw ? parseInt(limitRaw, 10) || 20 : 20
  const runs = listSubscriptionBillingRuns(limit)
  return NextResponse.json({ runs })
}

export async function POST(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")
  const userAgent = request.headers.get("user-agent")
  const runId = createSubscriptionBillingRunLog({
    source: "admin_manual",
    triggerIp: ip,
    triggerUserAgent: userAgent,
    triggerNote: "Triggered from admin cabinet-users page",
  })

  try {
    const result = await runSubscriptionBilling()
    finalizeSubscriptionBillingRunLog(runId, result)
    return NextResponse.json({ ...result, runId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    markSubscriptionBillingRunFailed(runId, message)
    console.error("[admin/subscription-billing/run] failed", error)
    return NextResponse.json({ error: "Не удалось запустить автосписание" }, { status: 500 })
  }
}
