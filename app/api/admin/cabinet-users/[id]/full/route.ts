import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { getDb } from "@/lib/db"

function safeJsonParse<T>(value: unknown): T | null {
  if (typeof value !== "string" || !value.trim()) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const db = getDb()

  const user = db.prepare("SELECT * FROM cabinet_users WHERE id = ?").get(id) as Record<string, unknown> | undefined
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const email = String(user.email ?? "")

  const tracks = db
    .prepare(
      `
      SELECT * FROM tracks
      WHERE user_id = ? OR LOWER(user_id) = LOWER(?)
      ORDER BY datetime(created_at) DESC
    `
    )
    .all(id, email) as Record<string, unknown>[]

  const albums = db
    .prepare(
      `
      SELECT * FROM albums
      WHERE user_id = ? OR LOWER(user_id) = LOWER(?)
      ORDER BY datetime(created_at) DESC
    `
    )
    .all(id, email) as Record<string, unknown>[]

  const orders = db
    .prepare(
      `
      SELECT * FROM orders
      WHERE user_id = ? OR LOWER(COALESCE(user_email, '')) = LOWER(?)
      ORDER BY datetime(created_at) DESC
    `
    )
    .all(id, email) as Record<string, unknown>[]

  const uploadDrafts = db
    .prepare(
      `
      SELECT * FROM upload_drafts
      WHERE user_id = ? OR LOWER(user_id) = LOWER(?)
      ORDER BY datetime(created_at) DESC
    `
    )
    .all(id, email) as Record<string, unknown>[]

  const withdrawalRequests = db
    .prepare(
      `
      SELECT * FROM withdrawal_requests
      WHERE user_id = ? OR LOWER(user_id) = LOWER(?)
      ORDER BY datetime(created_at) DESC
    `
    )
    .all(id, email) as Record<string, unknown>[]

  const streamingReports = db
    .prepare(
      `
      SELECT * FROM streaming_reports
      WHERE user_id = ? OR LOWER(user_id) = LOWER(?)
      ORDER BY datetime(created_at) DESC
    `
    )
    .all(id, email) as Record<string, unknown>[]

  const reviews = db
    .prepare(
      `
      SELECT * FROM reviews
      WHERE user_id = ? OR LOWER(COALESCE(user_id, '')) = LOWER(?)
      ORDER BY datetime(created_at) DESC
    `
    )
    .all(id, email) as Record<string, unknown>[]

  const artistSubscriptions = db
    .prepare(
      `
      SELECT * FROM cabinet_user_artist_subscriptions
      WHERE user_id = ?
      ORDER BY datetime(created_at) DESC
    `
    )
    .all(id) as Record<string, unknown>[]

  const announcementDismissals = db
    .prepare(
      `
      SELECT d.*, a.title AS announcement_title
      FROM cabinet_announcement_dismissals d
      LEFT JOIN cabinet_announcements a ON a.id = d.announcement_id
      WHERE d.user_id = ?
      ORDER BY datetime(d.dismissed_at) DESC
    `
    )
    .all(id) as Record<string, unknown>[]

  const legalAcceptanceEvents = db
    .prepare(
      `
      SELECT e.*, v.document_key, v.revision_label
      FROM legal_acceptance_events e
      LEFT JOIN legal_document_versions v ON v.id = e.document_version_id
      WHERE LOWER(e.user_email) = LOWER(?)
      ORDER BY datetime(e.occurred_at) DESC
    `
    )
    .all(email) as Record<string, unknown>[]

  const passwordResetTokens = db
    .prepare(
      `
      SELECT * FROM password_reset_tokens
      WHERE user_id = ? OR LOWER(email) = LOWER(?)
      ORDER BY datetime(expires_at) DESC
    `
    )
    .all(id, email) as Record<string, unknown>[]

  const pendingAutopay = db
    .prepare(
      `
      SELECT * FROM pending_subscription_autopay
      WHERE LOWER(email) = LOWER(?)
    `
    )
    .get(email) as Record<string, unknown> | undefined

  const autopayDisableTokens = db
    .prepare(
      `
      SELECT * FROM autopay_disable_tokens
      WHERE user_id = ? OR LOWER(email) = LOWER(?)
      ORDER BY datetime(expires_at) DESC
    `
    )
    .all(id, email) as Record<string, unknown>[]

  const deletedHistory = db
    .prepare(
      `
      SELECT * FROM cabinet_user_deletions
      WHERE LOWER(email) = LOWER(?)
      ORDER BY datetime(deleted_at) DESC
    `
    )
    .all(email) as Record<string, unknown>[]

  const preparedTracks = tracks.map((row) => ({
    ...row,
    platform_links_json: safeJsonParse<Record<string, string | undefined>>(row.platform_links),
  }))

  const preparedUploadDrafts = uploadDrafts.map((row) => ({
    ...row,
    payload_json_parsed: safeJsonParse<Record<string, unknown>>(row.payload_json),
  }))

  const preparedLegalEvents = legalAcceptanceEvents.map((row) => ({
    ...row,
    metadata_json_parsed: safeJsonParse<Record<string, unknown>>(row.metadata_json),
  }))

  return NextResponse.json({
    user,
    summary: {
      tracksCount: tracks.length,
      albumsCount: albums.length,
      ordersCount: orders.length,
      uploadDraftsCount: uploadDrafts.length,
      withdrawalRequestsCount: withdrawalRequests.length,
      streamingReportsCount: streamingReports.length,
      reviewsCount: reviews.length,
      artistSubscriptionsCount: artistSubscriptions.length,
      legalAcceptanceEventsCount: legalAcceptanceEvents.length,
    },
    related: {
      tracks: preparedTracks,
      albums,
      orders,
      uploadDrafts: preparedUploadDrafts,
      withdrawalRequests,
      streamingReports,
      reviews,
      artistSubscriptions,
      announcementDismissals,
      legalAcceptanceEvents: preparedLegalEvents,
      passwordResetTokens,
      pendingAutopay: pendingAutopay ?? null,
      autopayDisableTokens,
      deletedHistory,
    },
  })
}
