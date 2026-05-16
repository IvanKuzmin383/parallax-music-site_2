import { NextRequest, NextResponse } from "next/server"
import { expireOverdueUploadDrafts, listDraftsForExpiryWindow } from "@/lib/upload-drafts"

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const token = request.nextUrl.searchParams.get("secret")
  if (secret && token !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const now = Date.now()
  const remindStart = new Date(now + 23 * 60 * 60 * 1000).toISOString()
  const remindEnd = new Date(now + 25 * 60 * 60 * 1000).toISOString()
  const expiringSoon = await listDraftsForExpiryWindow(remindStart, remindEnd)
  for (const d of expiringSoon) {
    console.log("[upload-drafts-cleanup] reminder_24h", { draftId: d.id, userId: d.userId, expiresAt: d.expiresAt })
  }

  const expired = await expireOverdueUploadDrafts(new Date(now).toISOString())
  return NextResponse.json({
    ok: true,
    reminders24h: expiringSoon.length,
    expired: expired.length,
  })
}
