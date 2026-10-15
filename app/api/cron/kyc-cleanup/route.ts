import { NextRequest, NextResponse } from "next/server"
import { cleanupSettledKycDocuments } from "@/lib/cabinet-kyc"

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const token = request.nextUrl.searchParams.get("secret")
  if (secret && token !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const result = await cleanupSettledKycDocuments({ olderThanHours: 1 })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("[cron/kyc-cleanup] error", error)
    return NextResponse.json({ error: "cleanup failed" }, { status: 500 })
  }
}
