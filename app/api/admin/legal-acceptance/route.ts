import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { getLegalAcceptancesByUserEmail } from "@/lib/legal-acceptance"

function csvEscape(s: string | null | undefined): string {
  if (s == null) return ""
  const t = String(s)
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = request.nextUrl.searchParams.get("email")?.trim()
  if (!email) {
    return NextResponse.json({ error: "Укажите query-параметр email" }, { status: 400 })
  }

  const format = request.nextUrl.searchParams.get("format")?.toLowerCase()
  const db = getDb()
  const rows = getLegalAcceptancesByUserEmail(db, email)

  if (format === "csv") {
    const header = [
      "occurred_at",
      "user_email",
      "track_id",
      "track_name",
      "revision_label",
      "content_sha256",
      "event_type",
      "client_ip",
      "user_agent",
      "metadata_json",
    ]
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          csvEscape(r.occurredAt),
          csvEscape(r.userEmail),
          csvEscape(r.resourceId),
          csvEscape(r.trackName),
          csvEscape(r.revisionLabel),
          csvEscape(r.contentSha256),
          csvEscape(r.eventType),
          csvEscape(r.clientIp),
          csvEscape(r.userAgent),
          csvEscape(r.metadataJson),
        ].join(",")
      ),
    ]
    const csv = "\uFEFF" + lines.join("\r\n") + "\r\n"
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="legal-acceptance-${encodeURIComponent(email)}.csv"`,
      },
    })
  }

  return NextResponse.json({ email, events: rows })
}
