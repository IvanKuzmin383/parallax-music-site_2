import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { query, queryOne } from "@/lib/database"

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

  const user = await queryOne<Record<string, unknown>>(
    "SELECT * FROM cabinet_users WHERE id = ?",
    [id]
  )
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const email = String(user.email ?? "")

  const tracks = await query<Record<string, unknown>>(
    `
      SELECT * FROM tracks
      WHERE user_id = ? OR LOWER(user_id) = LOWER(?)
      ORDER BY created_at::timestamptz DESC
    `,
    [id, email]
  )

  const albums = await query<Record<string, unknown>>(
    `
      SELECT * FROM albums
      WHERE user_id = ? OR LOWER(user_id) = LOWER(?)
      ORDER BY created_at::timestamptz DESC
    `,
    [id, email]
  )

  const orders = await query<Record<string, unknown>>(
    `
      SELECT * FROM orders
      WHERE user_id = ? OR LOWER(COALESCE(user_email, '')) = LOWER(?)
      ORDER BY created_at::timestamptz DESC
    `,
    [id, email]
  )

  const uploadDrafts = await query<Record<string, unknown>>(
    `
      SELECT * FROM upload_drafts
      WHERE user_id = ? OR LOWER(user_id) = LOWER(?)
      ORDER BY created_at::timestamptz DESC
    `,
    [id, email]
  )

  const withdrawalRequests = await query<Record<string, unknown>>(
    `
      SELECT * FROM withdrawal_requests
      WHERE user_id = ? OR LOWER(user_id) = LOWER(?)
      ORDER BY created_at::timestamptz DESC
    `,
    [id, email]
  )

  const streamingReports = await query<Record<string, unknown>>(
    `
      SELECT * FROM streaming_reports
      WHERE user_id = ? OR LOWER(user_id) = LOWER(?)
      ORDER BY created_at::timestamptz DESC
    `,
    [id, email]
  )

  const artistSubscriptions = await query<Record<string, unknown>>(
    `
      SELECT * FROM cabinet_user_artist_subscriptions
      WHERE user_id = ?
      ORDER BY created_at::timestamptz DESC
    `,
    [id]
  )

  const announcementDismissals = await query<Record<string, unknown>>(
    `
      SELECT d.*, a.title AS announcement_title
      FROM cabinet_announcement_dismissals d
      LEFT JOIN cabinet_announcements a ON a.id = d.announcement_id
      WHERE d.user_id = ?
      ORDER BY d.dismissed_at::timestamptz DESC
    `,
    [id]
  )

  const legalAcceptanceEvents = await query<Record<string, unknown>>(
    `
      SELECT e.*, v.document_key, v.revision_label
      FROM legal_acceptance_events e
      LEFT JOIN legal_document_versions v ON v.id = e.document_version_id
      WHERE LOWER(e.user_email) = LOWER(?)
      ORDER BY e.occurred_at::timestamptz DESC
    `,
    [email]
  )

  const passwordResetTokens = await query<Record<string, unknown>>(
    `
      SELECT * FROM password_reset_tokens
      WHERE user_id = ? OR LOWER(email) = LOWER(?)
      ORDER BY expires_at::timestamptz DESC
    `,
    [id, email]
  )

  const pendingAutopay = await queryOne<Record<string, unknown>>(
    `
      SELECT * FROM pending_subscription_autopay
      WHERE LOWER(email) = LOWER(?)
    `,
    [email]
  )

  const autopayDisableTokens = await query<Record<string, unknown>>(
    `
      SELECT * FROM autopay_disable_tokens
      WHERE user_id = ? OR LOWER(email) = LOWER(?)
      ORDER BY expires_at::timestamptz DESC
    `,
    [id, email]
  )

  const deletedHistory = await query<Record<string, unknown>>(
    `
      SELECT * FROM cabinet_user_deletions
      WHERE LOWER(email) = LOWER(?)
      ORDER BY deleted_at::timestamptz DESC
    `,
    [email]
  )

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
      reviewsCount: 0,
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
      reviews: [],
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
