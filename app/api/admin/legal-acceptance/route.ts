import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getDb } from "@/lib/db"
import {
  countLegalAcceptances,
  getLegalAcceptancesList,
  LEGAL_ACCEPTANCE_PAGE_SIZE,
  type LegalAcceptanceRow,
} from "@/lib/legal-acceptance"

function csvEscape(s: string | null | undefined): string {
  if (s == null) return ""
  const t = String(s)
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

function rowsToCsv(rows: LegalAcceptanceRow[]): string {
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
  return "\uFEFF" + lines.join("\r\n") + "\r\n"
}

export async function GET(request: NextRequest) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const email = request.nextUrl.searchParams.get("email")?.trim() || undefined
  const format = request.nextUrl.searchParams.get("format")?.toLowerCase()

  const limitParam = request.nextUrl.searchParams.get("limit")
  const offsetParam = request.nextUrl.searchParams.get("offset")
  const limit = Math.min(
    Math.max(parseInt(limitParam ?? String(LEGAL_ACCEPTANCE_PAGE_SIZE), 10) || LEGAL_ACCEPTANCE_PAGE_SIZE, 1),
    100
  )
  const offset = Math.max(parseInt(offsetParam ?? "0", 10) || 0, 0)

  const db = getDb()

  if (format === "csv") {
    const rows = getLegalAcceptancesList(db, {
      email,
      limit: 1_000_000,
      offset: 0,
    })
    const csv = rowsToCsv(rows)
    const filename = email
      ? `legal-acceptance-${email.replace(/@/g, "_at_")}.csv`
      : "legal-acceptance-all.csv"
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }

  const total = countLegalAcceptances(db, { email })
  const events = getLegalAcceptancesList(db, { email, limit, offset })
  const hasMore = offset + events.length < total

  return NextResponse.json({
    email: email ?? null,
    events,
    total,
    limit,
    offset,
    hasMore,
  })
}
