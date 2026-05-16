import crypto from "crypto"
import { promises as fs } from "fs"
import path from "path"
import { getDb } from "./db"
import { getAudioDir } from "./tracks"

export type UploadDraftKind = "single" | "album"
export type UploadDraftStatus = "collecting" | "awaiting_payment" | "paid" | "finalized" | "expired" | "cancelled"

export interface UploadDraftPayload {
  trackName?: string
  artistName?: string
  labelName?: string
  genre?: string
  mood?: string
  shortDescription?: string
  lyricsText?: string
  lyricsAuthor?: string
  musicAuthor?: string
  musicRights?: string
  musicAiService?: string
  lyricsRights?: string
  performanceRights?: string
  isInstrumental?: boolean
  backingAuthor?: string
  requestAiCover?: boolean
  /** Перенос релиза с другого дистрибьютора: обязательны transferUpc и transferIsrc */
  transferFromOtherDistributor?: boolean
  transferUpc?: string
  transferIsrc?: string
  albumTitle?: string
  albumArtistName?: string
  releaseDate?: string
  addons: {
    trackCover?: {
      enabled: boolean
      trackTitle?: string
      comment?: string
      contactType?: "telegram" | "vk" | "max"
      contactValue?: string
    }
    verticalVideo?: {
      enabled: boolean
      videosCount?: number
      trackTitle?: string
      comment?: string
      contactType?: "telegram" | "vk" | "max"
      contactValue?: string
    }
    aiMastering?: {
      enabled: boolean
      tracksCount?: number
      trackTitles?: string[]
      contactEmail?: string
      contactTelegram?: string
    }
    yandexVideoshot?: {
      enabled: boolean
      trackTitle?: string
      comment?: string
    }
    yandexVideoshotCreation?: {
      enabled: boolean
      trackTitle?: string
      comment?: string
    }
    yandexVideoavatar?: {
      enabled: boolean
      trackTitle?: string
      comment?: string
    }
    spotifyVideoshot?: {
      enabled: boolean
      trackTitle?: string
      comment?: string
    }
  }
  [key: string]: unknown
}

export interface UploadDraft {
  id: string
  userId: string
  kind: UploadDraftKind
  status: UploadDraftStatus
  payload: UploadDraftPayload
  audioRelPath?: string
  coverRelPath?: string
  albumId?: string
  bundleOrderId?: string
  expiresAt: string
  createdAt: string
  updatedAt: string
}

interface UploadDraftRow {
  id: string
  user_id: string
  kind: UploadDraftKind
  status: UploadDraftStatus
  payload_json: string
  audio_rel_path: string | null
  cover_rel_path: string | null
  album_id: string | null
  bundle_order_id: string | null
  expires_at: string
  created_at: string
  updated_at: string
}

function rowToDraft(row: UploadDraftRow): UploadDraft {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    status: row.status,
    payload: JSON.parse(row.payload_json) as UploadDraftPayload,
    audioRelPath: row.audio_rel_path ?? undefined,
    coverRelPath: row.cover_rel_path ?? undefined,
    albumId: row.album_id ?? undefined,
    bundleOrderId: row.bundle_order_id ?? undefined,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getUploadDraftsDir(): Promise<string> {
  const audioDir = await getAudioDir()
  const uploadsDir = path.dirname(audioDir)
  const draftsDir = path.join(uploadsDir, "upload-drafts")
  await fs.mkdir(draftsDir, { recursive: true })
  return draftsDir
}

export async function createUploadDraft(input: {
  userId: string
  kind: UploadDraftKind
  status: UploadDraftStatus
  payload: UploadDraftPayload
  audioRelPath?: string
  coverRelPath?: string
  albumId?: string
  bundleOrderId?: string
  expiresInDays?: number
}): Promise<UploadDraft> {
  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const expiresInDays = input.expiresInDays ?? 7
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
  const db = getDb()
  db.prepare(`
    INSERT INTO upload_drafts (
      id, user_id, kind, status, payload_json, audio_rel_path, cover_rel_path, album_id, bundle_order_id, expires_at, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.userId,
    input.kind,
    input.status,
    JSON.stringify(input.payload),
    input.audioRelPath ?? null,
    input.coverRelPath ?? null,
    input.albumId ?? null,
    input.bundleOrderId ?? null,
    expiresAt,
    now,
    now
  )
  return rowToDraft(db.prepare("SELECT * FROM upload_drafts WHERE id = ?").get(id) as UploadDraftRow)
}

export async function getUploadDraftById(id: string): Promise<UploadDraft | null> {
  const db = getDb()
  const row = db.prepare("SELECT * FROM upload_drafts WHERE id = ?").get(id) as UploadDraftRow | undefined
  return row ? rowToDraft(row) : null
}

export async function getUploadDraftByBundleOrderId(orderId: string): Promise<UploadDraft | null> {
  const db = getDb()
  const row = db
    .prepare("SELECT * FROM upload_drafts WHERE bundle_order_id = ? ORDER BY updated_at DESC LIMIT 1")
    .get(orderId) as UploadDraftRow | undefined
  return row ? rowToDraft(row) : null
}

export async function getUploadDraftByAlbumId(albumId: string): Promise<UploadDraft | null> {
  const db = getDb()
  const row = db.prepare("SELECT * FROM upload_drafts WHERE album_id = ? ORDER BY created_at DESC LIMIT 1").get(albumId) as UploadDraftRow | undefined
  return row ? rowToDraft(row) : null
}

export async function listUploadDrafts(params?: {
  status?: UploadDraftStatus
  userId?: string
  limit?: number
}): Promise<UploadDraft[]> {
  const db = getDb()
  const where: string[] = []
  const values: unknown[] = []
  if (params?.status) {
    where.push("status = ?")
    values.push(params.status)
  }
  if (params?.userId) {
    where.push("LOWER(user_id) = LOWER(?)")
    values.push(params.userId)
  }
  const limit = params?.limit ?? 200
  const sql = `SELECT * FROM upload_drafts ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY created_at DESC LIMIT ?`
  const rows = db.prepare(sql).all(...values, limit) as UploadDraftRow[]
  return rows.map(rowToDraft)
}

export type UploadDraftUpdate = Omit<
  Partial<Omit<UploadDraft, "id" | "userId" | "createdAt">>,
  "coverRelPath" | "audioRelPath" | "bundleOrderId"
> & {
  /** Передайте `null`, чтобы снять файл обложки в БД (при заказе AI-обложки). */
  coverRelPath?: string | null
  audioRelPath?: string | null
  /** Передайте `null`, чтобы отвязать неоплаченный заказ услуг после снятия допов. */
  bundleOrderId?: string | null
}

export async function updateUploadDraft(id: string, partial: UploadDraftUpdate): Promise<UploadDraft | null> {
  const current = await getUploadDraftById(id)
  if (!current) return null
  const updatedAt = new Date().toISOString()
  const nextAudioRelPath = Object.prototype.hasOwnProperty.call(partial, "audioRelPath")
    ? partial.audioRelPath ?? null
    : current.audioRelPath ?? null
  const nextCoverRelPath = Object.prototype.hasOwnProperty.call(partial, "coverRelPath")
    ? partial.coverRelPath ?? null
    : current.coverRelPath ?? null
  const nextBundleOrderId = Object.prototype.hasOwnProperty.call(partial, "bundleOrderId")
    ? partial.bundleOrderId ?? null
    : current.bundleOrderId ?? null
  const db = getDb()
  db.prepare(`
    UPDATE upload_drafts
    SET status = ?, payload_json = ?, audio_rel_path = ?, cover_rel_path = ?, album_id = ?, bundle_order_id = ?, expires_at = ?, updated_at = ?
    WHERE id = ?
  `).run(
    partial.status ?? current.status,
    JSON.stringify(partial.payload ?? current.payload),
    nextAudioRelPath,
    nextCoverRelPath,
    partial.albumId ?? current.albumId ?? null,
    nextBundleOrderId,
    partial.expiresAt ?? current.expiresAt,
    updatedAt,
    id
  )
  return getUploadDraftById(id)
}

export async function deleteUploadDraft(id: string): Promise<boolean> {
  const draft = await getUploadDraftById(id)
  if (!draft) return false
  await removeUploadDraftFiles(draft)
  const db = getDb()
  const result = db.prepare("DELETE FROM upload_drafts WHERE id = ?").run(id)
  return result.changes > 0
}

/** Удалить один файл из каталога черновиков (при замене аудио/обложки). */
export async function unlinkUploadDraftMediaFile(relPath: string | null | undefined): Promise<void> {
  if (!relPath) return
  const draftsDir = await getUploadDraftsDir()
  await safeUnlink(path.join(draftsDir, relPath))
}

export async function markUploadDraftPaid(id: string, orderId: string): Promise<UploadDraft | null> {
  return updateUploadDraft(id, { status: "paid", bundleOrderId: orderId })
}

export async function markUploadDraftFinalized(id: string): Promise<UploadDraft | null> {
  return updateUploadDraft(id, { status: "finalized" })
}

export async function listDraftsForExpiryWindow(startIso: string, endIso: string): Promise<UploadDraft[]> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM upload_drafts
    WHERE status IN ('collecting', 'awaiting_payment', 'paid')
      AND expires_at >= ?
      AND expires_at < ?
    ORDER BY expires_at ASC
  `).all(startIso, endIso) as UploadDraftRow[]
  return rows.map(rowToDraft)
}

async function safeUnlink(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath)
  } catch {
    // ignore
  }
}

function collectDraftAudioRelPaths(draft: UploadDraft): string[] {
  const relPaths = new Set<string>()

  if (typeof draft.audioRelPath === "string" && draft.audioRelPath.trim()) {
    relPaths.add(draft.audioRelPath.trim())
  }

  const payload = draft.payload as Record<string, unknown>
  if (Array.isArray(payload.albumTracks)) {
    for (const track of payload.albumTracks) {
      if (!track || typeof track !== "object") continue
      const audioRelPath = (track as { audioRelPath?: unknown }).audioRelPath
      if (typeof audioRelPath === "string" && audioRelPath.trim()) {
        relPaths.add(audioRelPath.trim())
      }
    }
  }

  return [...relPaths]
}

export async function removeUploadDraftAudioFiles(draft: UploadDraft): Promise<void> {
  const draftsDir = await getUploadDraftsDir()
  const relPaths = collectDraftAudioRelPaths(draft)
  for (const relPath of relPaths) {
    const safeName = path.basename(relPath)
    if (safeName !== relPath || !safeName.toLowerCase().endsWith(".wav")) continue
    await safeUnlink(path.join(draftsDir, safeName))
  }
}

export async function removeUploadDraftFiles(draft: UploadDraft): Promise<void> {
  if (draft.audioRelPath || draft.coverRelPath || Array.isArray((draft.payload as Record<string, unknown>).albumTracks)) {
    const draftsDir = await getUploadDraftsDir()
    await removeUploadDraftAudioFiles(draft)
    if (draft.coverRelPath) await safeUnlink(path.join(draftsDir, draft.coverRelPath))
    return
  }
  const draftsDir = await getUploadDraftsDir()
  const legacyDir = path.join(draftsDir, draft.id)
  try {
    await fs.rm(legacyDir, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

export async function expireOverdueUploadDrafts(nowIso = new Date().toISOString()): Promise<UploadDraft[]> {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM upload_drafts
    WHERE status IN ('collecting', 'awaiting_payment', 'paid')
      AND expires_at < ?
  `).all(nowIso) as UploadDraftRow[]
  const drafts = rows.map(rowToDraft)
  for (const draft of drafts) {
    await removeUploadDraftFiles(draft)
    await updateUploadDraft(draft.id, { status: "expired" })
  }
  return drafts
}
