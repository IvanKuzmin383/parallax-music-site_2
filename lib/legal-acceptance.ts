import crypto from "crypto"
import fs from "fs"
import path from "path"
import type { NextRequest } from "next/server"
import type Database from "better-sqlite3"

export const DOCUMENT_KEY_PUBLIC_OFFER = "public_offer"
export const EVENT_LICENSE_TRACK_UPLOAD = "license_track_upload"
export const RESOURCE_TYPE_TRACK = "track"

const OFFER_FILE = path.join("data", "public-offer.md")

export function getPublicOfferAbsolutePath(): string {
  return path.join(process.cwd(), OFFER_FILE)
}

export function sha256Buffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex")
}

/** Дата из строки «Последняя редакция: …» в шапке md, если есть */
export function extractRevisionLabelFromMarkdown(content: string): string | null {
  const m = content.match(/Последняя редакция:\s*(.+)/i)
  return m ? m[1].trim() : null
}

/**
 * Возвращает id строки в legal_document_versions для текущего файла оферты.
 * При новом хэше содержимого создаёт новую версию.
 */
export function getOrCreateDocumentVersionId(db: Database.Database): string {
  const fullPath = getPublicOfferAbsolutePath()
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Legal document not found: ${OFFER_FILE}`)
  }
  const buf = fs.readFileSync(fullPath)
  const contentSha256 = sha256Buffer(buf)
  const row = db
    .prepare(
      `SELECT id FROM legal_document_versions WHERE document_key = ? AND content_sha256 = ?`
    )
    .get(DOCUMENT_KEY_PUBLIC_OFFER, contentSha256) as { id: string } | undefined
  if (row) return row.id

  const id = crypto.randomUUID()
  const revisionLabel =
    extractRevisionLabelFromMarkdown(buf.toString("utf-8")) ?? contentSha256.slice(0, 16)
  const now = new Date().toISOString()
  db.prepare(
    `INSERT INTO legal_document_versions (id, document_key, revision_label, content_sha256, source_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, DOCUMENT_KEY_PUBLIC_OFFER, revisionLabel, contentSha256, OFFER_FILE, now)
  return id
}

export function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim()
    if (first) return first
  }
  const realIp = request.headers.get("x-real-ip")?.trim()
  if (realIp) return realIp
  return null
}

export function getUserAgent(request: NextRequest): string | null {
  return request.headers.get("user-agent")?.slice(0, 2000) ?? null
}

export type RecordLicenseTrackParams = {
  userEmail: string
  trackId: string
  occurredAtIso: string
  clientIp: string | null
  userAgent: string | null
  backfilled?: boolean
}

export function recordLicenseAcceptanceForTrack(
  db: Database.Database,
  params: RecordLicenseTrackParams
): void {
  const documentVersionId = getOrCreateDocumentVersionId(db)
  const eventId = crypto.randomUUID()
  const metadataJson =
    params.backfilled === true ? JSON.stringify({ backfilled: true }) : null
  db.prepare(
    `INSERT INTO legal_acceptance_events (
      id, user_email, document_version_id, event_type, resource_type, resource_id,
      occurred_at, client_ip, user_agent, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    eventId,
    params.userEmail,
    documentVersionId,
    EVENT_LICENSE_TRACK_UPLOAD,
    RESOURCE_TYPE_TRACK,
    params.trackId,
    params.occurredAtIso,
    params.clientIp,
    params.userAgent,
    metadataJson
  )
}

/**
 * Одна попытка записи; при дубликате (UNIQUE) - игнорировать (идемпотентность).
 */
export function tryRecordLicenseAcceptanceForTrack(
  db: Database.Database,
  params: RecordLicenseTrackParams
): void {
  try {
    recordLicenseAcceptanceForTrack(db, params)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return
    }
    throw e
  }
}

export type TrackLicenseAcceptanceInput = {
  id: string
  userId: string
  createdAt?: string
}

/** Записать акцепт лицензии для нескольких треков (идемпотентно). */
export function recordLicenseAcceptancesForTracks(
  db: Database.Database,
  tracks: TrackLicenseAcceptanceInput[],
  options?: { clientIp?: string | null; userAgent?: string | null; occurredAtIso?: string }
): void {
  const occurredAtIso = options?.occurredAtIso ?? new Date().toISOString()
  for (const t of tracks) {
    tryRecordLicenseAcceptanceForTrack(db, {
      userEmail: t.userId,
      trackId: t.id,
      occurredAtIso: t.createdAt ?? occurredAtIso,
      clientIp: options?.clientIp ?? null,
      userAgent: options?.userAgent ?? null,
    })
  }
}

type TrackRow = { id: string; user_id: string; created_at: string }

/**
 * Для треков, созданных до внедрения журнала: событие с текущей редакцией оферты,
 * occurred_at = дата создания трека, metadata backfilled.
 */
function insertBackfilledAcceptanceIfMissing(
  db: Database.Database,
  versionId: string,
  track: TrackRow
): boolean {
  const exists = db
    .prepare(
      `SELECT 1 FROM legal_acceptance_events
       WHERE resource_type = ? AND resource_id = ? AND event_type = ? LIMIT 1`
    )
    .get(RESOURCE_TYPE_TRACK, track.id, EVENT_LICENSE_TRACK_UPLOAD)
  if (exists) return false

  const meta = JSON.stringify({ backfilled: true })
  db.prepare(
    `INSERT INTO legal_acceptance_events (
      id, user_email, document_version_id, event_type, resource_type, resource_id,
      occurred_at, client_ip, user_agent, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomUUID(),
    track.user_id,
    versionId,
    EVENT_LICENSE_TRACK_UPLOAD,
    RESOURCE_TYPE_TRACK,
    track.id,
    track.created_at,
    null,
    null,
    meta
  )
  return true
}

/** Догнать журнал акцептов для треков пользователя без события. */
export function backfillMissingTrackAcceptancesForUser(
  db: Database.Database,
  userEmail: string
): number {
  const versionId = getOrCreateDocumentVersionId(db)
  const tracks = db
    .prepare(`SELECT id, user_id, created_at FROM tracks WHERE LOWER(user_id) = LOWER(?)`)
    .all(userEmail.trim()) as TrackRow[]

  let n = 0
  for (const t of tracks) {
    if (insertBackfilledAcceptanceIfMissing(db, versionId, t)) n += 1
  }
  return n
}

export function backfillTrackAcceptancesWithCurrentOffer(db: Database.Database): number {
  const versionId = getOrCreateDocumentVersionId(db)
  const tracks = db
    .prepare(`SELECT id, user_id, created_at FROM tracks`)
    .all() as TrackRow[]

  let n = 0
  for (const t of tracks) {
    if (insertBackfilledAcceptanceIfMissing(db, versionId, t)) n += 1
  }
  return n
}

export type LegalAcceptanceRow = {
  id: string
  userEmail: string
  documentVersionId: string
  revisionLabel: string
  contentSha256: string
  eventType: string
  resourceType: string
  resourceId: string
  occurredAt: string
  clientIp: string | null
  userAgent: string | null
  metadataJson: string | null
  trackName: string | null
}

const LEGAL_ACCEPTANCE_LIST_SELECT = `
  SELECT
    e.id,
    e.user_email AS userEmail,
    e.document_version_id AS documentVersionId,
    v.revision_label AS revisionLabel,
    v.content_sha256 AS contentSha256,
    e.event_type AS eventType,
    e.resource_type AS resourceType,
    e.resource_id AS resourceId,
    e.occurred_at AS occurredAt,
    e.client_ip AS clientIp,
    e.user_agent AS userAgent,
    e.metadata_json AS metadataJson,
    tr.track_name AS trackName
  FROM legal_acceptance_events e
  JOIN legal_document_versions v ON v.id = e.document_version_id
  LEFT JOIN tracks tr ON tr.id = e.resource_id AND e.resource_type = 'track'
`

export const LEGAL_ACCEPTANCE_PAGE_SIZE = 15

export function countLegalAcceptances(
  db: Database.Database,
  options?: { email?: string }
): number {
  const email = options?.email?.trim()
  if (email) {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS cnt FROM legal_acceptance_events e WHERE LOWER(e.user_email) = LOWER(?)`
      )
      .get(email) as { cnt: number }
    return row.cnt
  }
  const row = db.prepare(`SELECT COUNT(*) AS cnt FROM legal_acceptance_events`).get() as {
    cnt: number
  }
  return row.cnt
}

export function getLegalAcceptancesList(
  db: Database.Database,
  options: { limit: number; offset: number; email?: string }
): LegalAcceptanceRow[] {
  const email = options.email?.trim()
  if (email) {
    return db
      .prepare(
        `${LEGAL_ACCEPTANCE_LIST_SELECT}
         WHERE LOWER(e.user_email) = LOWER(?)
         ORDER BY datetime(e.occurred_at) DESC
         LIMIT ? OFFSET ?`
      )
      .all(email, options.limit, options.offset) as LegalAcceptanceRow[]
  }
  return db
    .prepare(
      `${LEGAL_ACCEPTANCE_LIST_SELECT}
       ORDER BY datetime(e.occurred_at) DESC
       LIMIT ? OFFSET ?`
    )
    .all(options.limit, options.offset) as LegalAcceptanceRow[]
}

export function getLegalAcceptancesByUserEmail(
  db: Database.Database,
  userEmail: string
): LegalAcceptanceRow[] {
  return getLegalAcceptancesList(db, {
    email: userEmail,
    limit: 1_000_000,
    offset: 0,
  })
}
