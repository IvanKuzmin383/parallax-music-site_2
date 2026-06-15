import crypto from "crypto"
import fs from "fs"
import path from "path"
import type { NextRequest } from "next/server"
import type { PoolClient } from "pg"
import { clientExecute, clientQuery, query, queryOne } from "./database"

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

function isUniqueViolation(e: unknown): boolean {
  if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505") {
    return true
  }
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes("UNIQUE") || msg.includes("unique") || msg.includes("duplicate key")
}

/**
 * Возвращает id строки в legal_document_versions для текущего файла оферты.
 * При новом хэше содержимого создаёт новую версию.
 */
export async function getOrCreateDocumentVersionId(client: PoolClient): Promise<string> {
  const fullPath = getPublicOfferAbsolutePath()
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Legal document not found: ${OFFER_FILE}`)
  }
  const buf = fs.readFileSync(fullPath)
  const contentSha256 = sha256Buffer(buf)
  const rows = await clientQuery<{ id: string }>(
    client,
    `SELECT id FROM legal_document_versions WHERE document_key = ? AND content_sha256 = ?`,
    [DOCUMENT_KEY_PUBLIC_OFFER, contentSha256]
  )
  const row = rows[0]
  if (row) return row.id

  const id = crypto.randomUUID()
  const revisionLabel =
    extractRevisionLabelFromMarkdown(buf.toString("utf-8")) ?? contentSha256.slice(0, 16)
  const now = new Date().toISOString()
  await clientExecute(
    client,
    `INSERT INTO legal_document_versions (id, document_key, revision_label, content_sha256, source_path, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, DOCUMENT_KEY_PUBLIC_OFFER, revisionLabel, contentSha256, OFFER_FILE, now]
  )
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

export async function recordLicenseAcceptanceForTrack(
  client: PoolClient,
  params: RecordLicenseTrackParams
): Promise<void> {
  const documentVersionId = await getOrCreateDocumentVersionId(client)
  const eventId = crypto.randomUUID()
  const metadataJson =
    params.backfilled === true ? JSON.stringify({ backfilled: true }) : null
  await clientExecute(
    client,
    `INSERT INTO legal_acceptance_events (
      id, user_email, document_version_id, event_type, resource_type, resource_id,
      occurred_at, client_ip, user_agent, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      eventId,
      params.userEmail,
      documentVersionId,
      EVENT_LICENSE_TRACK_UPLOAD,
      RESOURCE_TYPE_TRACK,
      params.trackId,
      params.occurredAtIso,
      params.clientIp,
      params.userAgent,
      metadataJson,
    ]
  )
}

/**
 * Одна попытка записи; при дубликате (UNIQUE) - игнорировать (идемпотентность).
 */
export async function tryRecordLicenseAcceptanceForTrack(
  client: PoolClient,
  params: RecordLicenseTrackParams
): Promise<void> {
  try {
    await recordLicenseAcceptanceForTrack(client, params)
  } catch (e: unknown) {
    if (isUniqueViolation(e)) {
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
export async function recordLicenseAcceptancesForTracks(
  client: PoolClient,
  tracks: TrackLicenseAcceptanceInput[],
  options?: { clientIp?: string | null; userAgent?: string | null; occurredAtIso?: string }
): Promise<void> {
  const occurredAtIso = options?.occurredAtIso ?? new Date().toISOString()
  for (const t of tracks) {
    await tryRecordLicenseAcceptanceForTrack(client, {
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
async function insertBackfilledAcceptanceIfMissing(
  client: PoolClient,
  versionId: string,
  track: TrackRow
): Promise<boolean> {
  const exists = await clientQuery(
    client,
    `SELECT 1 FROM legal_acceptance_events
     WHERE resource_type = ? AND resource_id = ? AND event_type = ? LIMIT 1`,
    [RESOURCE_TYPE_TRACK, track.id, EVENT_LICENSE_TRACK_UPLOAD]
  )
  if (exists.length > 0) return false

  const meta = JSON.stringify({ backfilled: true })
  await clientExecute(
    client,
    `INSERT INTO legal_acceptance_events (
      id, user_email, document_version_id, event_type, resource_type, resource_id,
      occurred_at, client_ip, user_agent, metadata_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      crypto.randomUUID(),
      track.user_id,
      versionId,
      EVENT_LICENSE_TRACK_UPLOAD,
      RESOURCE_TYPE_TRACK,
      track.id,
      track.created_at,
      null,
      null,
      meta,
    ]
  )
  return true
}

/** Догнать журнал акцептов для треков пользователя без события. */
export async function backfillMissingTrackAcceptancesForUser(
  client: PoolClient,
  userEmail: string
): Promise<number> {
  const versionId = await getOrCreateDocumentVersionId(client)
  const tracks = await clientQuery<TrackRow>(
    client,
    `SELECT id, user_id, created_at FROM tracks WHERE LOWER(user_id) = LOWER(?)`,
    [userEmail.trim()]
  )

  let n = 0
  for (const t of tracks) {
    if (await insertBackfilledAcceptanceIfMissing(client, versionId, t)) n += 1
  }
  return n
}

export async function backfillTrackAcceptancesWithCurrentOffer(client: PoolClient): Promise<number> {
  const versionId = await getOrCreateDocumentVersionId(client)
  const tracks = await clientQuery<TrackRow>(client, `SELECT id, user_id, created_at FROM tracks`)

  let n = 0
  for (const t of tracks) {
    if (await insertBackfilledAcceptanceIfMissing(client, versionId, t)) n += 1
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
    e.user_email AS "userEmail",
    e.document_version_id AS "documentVersionId",
    v.revision_label AS "revisionLabel",
    v.content_sha256 AS "contentSha256",
    e.event_type AS "eventType",
    e.resource_type AS "resourceType",
    e.resource_id AS "resourceId",
    e.occurred_at AS "occurredAt",
    e.client_ip AS "clientIp",
    e.user_agent AS "userAgent",
    e.metadata_json AS "metadataJson",
    tr.track_name AS "trackName"
  FROM legal_acceptance_events e
  JOIN legal_document_versions v ON v.id = e.document_version_id
  LEFT JOIN tracks tr ON tr.id = e.resource_id AND e.resource_type = 'track'
`

export const LEGAL_ACCEPTANCE_PAGE_SIZE = 15

export async function countLegalAcceptances(options?: { email?: string }): Promise<number> {
  const email = options?.email?.trim()
  if (email) {
    const row = await queryOne<{ cnt: string | number }>(
      `SELECT COUNT(*) AS cnt FROM legal_acceptance_events e WHERE LOWER(e.user_email) = LOWER(?)`,
      [email]
    )
    return Number(row?.cnt ?? 0)
  }
  const row = await queryOne<{ cnt: string | number }>(
    `SELECT COUNT(*) AS cnt FROM legal_acceptance_events`
  )
  return Number(row?.cnt ?? 0)
}

export async function getLegalAcceptancesList(options: {
  limit: number
  offset: number
  email?: string
}): Promise<LegalAcceptanceRow[]> {
  const email = options.email?.trim()
  if (email) {
    return query<LegalAcceptanceRow>(
      `${LEGAL_ACCEPTANCE_LIST_SELECT}
       WHERE LOWER(e.user_email) = LOWER(?)
       ORDER BY e.occurred_at::timestamptz DESC
       LIMIT ? OFFSET ?`,
      [email, options.limit, options.offset]
    )
  }
  return query<LegalAcceptanceRow>(
    `${LEGAL_ACCEPTANCE_LIST_SELECT}
     ORDER BY e.occurred_at::timestamptz DESC
     LIMIT ? OFFSET ?`,
    [options.limit, options.offset]
  )
}

export async function getLegalAcceptancesByUserEmail(userEmail: string): Promise<LegalAcceptanceRow[]> {
  return getLegalAcceptancesList({
    email: userEmail,
    limit: 1_000_000,
    offset: 0,
  })
}
