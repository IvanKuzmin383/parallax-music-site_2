import { randomUUID } from "node:crypto"
import { execute, query, queryOne } from "@/lib/database"
import { getCabinetUserById } from "@/lib/cabinet-users"
import type { VideoClipStatus, VideoClipView } from "@/lib/video-clips-shared"

export type { VideoClipStatus, VideoClipView }

type ClipRow = {
  id: string
  user_id: string
  title: string
  artist: string
  track_id: string | null
  order_id: string | null
  file_url: string | null
  cover_url: string | null
  status: string
  platforms_json: string | null
  release_date: string | null
  created_at: string
  updated_at: string
}

function isStatus(v: string): v is VideoClipStatus {
  return (
    v === "draft" ||
    v === "awaiting_payment" ||
    v === "on_moderation" ||
    v === "on_platforms" ||
    v === "rejected"
  )
}

function parsePlatforms(raw: string | null): string[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((x) => String(x).trim()).filter(Boolean)
  } catch {
    return []
  }
}

function toView(row: ClipRow): VideoClipView {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    status: isStatus(row.status) ? row.status : "draft",
    trackId: row.track_id,
    orderId: row.order_id,
    fileUrl: row.file_url,
    coverUrl: row.cover_url,
    platforms: parsePlatforms(row.platforms_json),
    releaseDate: row.release_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listVideoClipsForUser(userId: string): Promise<VideoClipView[]> {
  const rows = await query<ClipRow>(
    `
    SELECT * FROM video_clips
    WHERE user_id = ?
    ORDER BY updated_at DESC, created_at DESC
    `,
    [userId]
  )
  return rows.map(toView)
}

export async function listAllVideoClips(args?: {
  userId?: string | null
  status?: string | null
  limit?: number
  offset?: number
}): Promise<{ rows: VideoClipView[]; total: number }> {
  const limit = Math.min(Math.max(1, args?.limit ?? 50), 200)
  const offset = Math.max(0, args?.offset ?? 0)
  const where: string[] = []
  const params: Array<string | number> = []
  if (args?.userId?.trim()) {
    where.push("user_id = ?")
    params.push(args.userId.trim())
  }
  if (args?.status?.trim()) {
    where.push("status = ?")
    params.push(args.status.trim())
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : ""
  const countRow = await queryOne<{ c: number | string }>(
    `SELECT COUNT(*)::int AS c FROM video_clips ${whereSql}`,
    params
  )
  const rows = await query<ClipRow>(
    `
    SELECT * FROM video_clips
    ${whereSql}
    ORDER BY updated_at DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  )
  return { rows: rows.map(toView), total: Number(countRow?.c) || 0 }
}

export async function createVideoClip(input: {
  userId: string
  title: string
  artist: string
  trackId?: string | null
  orderId?: string | null
  fileUrl?: string | null
  coverUrl?: string | null
  status?: VideoClipStatus
  platforms?: string[]
  releaseDate?: string | null
}): Promise<VideoClipView> {
  const id = randomUUID()
  const now = new Date().toISOString()
  const status = input.status ?? "draft"
  const platformsJson =
    input.platforms && input.platforms.length > 0 ? JSON.stringify(input.platforms) : null
  await execute(
    `
    INSERT INTO video_clips (
      id, user_id, title, artist, track_id, order_id, file_url, cover_url,
      status, platforms_json, release_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      input.userId,
      input.title.trim(),
      input.artist.trim(),
      input.trackId ?? null,
      input.orderId ?? null,
      input.fileUrl ?? null,
      input.coverUrl ?? null,
      status,
      platformsJson,
      input.releaseDate ?? null,
      now,
      now,
    ]
  )
  return toView({
    id,
    user_id: input.userId,
    title: input.title.trim(),
    artist: input.artist.trim(),
    track_id: input.trackId ?? null,
    order_id: input.orderId ?? null,
    file_url: input.fileUrl ?? null,
    cover_url: input.coverUrl ?? null,
    status,
    platforms_json: platformsJson,
    release_date: input.releaseDate ?? null,
    created_at: now,
    updated_at: now,
  })
}

export async function updateVideoClip(
  id: string,
  patch: {
    status?: VideoClipStatus
    title?: string
    artist?: string
    fileUrl?: string | null
    coverUrl?: string | null
    platforms?: string[]
    releaseDate?: string | null
  }
): Promise<VideoClipView | null> {
  const existing = await queryOne<ClipRow>(`SELECT * FROM video_clips WHERE id = ?`, [id])
  if (!existing) return null

  const status = patch.status ?? (isStatus(existing.status) ? existing.status : "draft")
  const title = patch.title?.trim() || existing.title
  const artist = patch.artist?.trim() || existing.artist
  const fileUrl = patch.fileUrl !== undefined ? patch.fileUrl : existing.file_url
  const coverUrl = patch.coverUrl !== undefined ? patch.coverUrl : existing.cover_url
  const platformsJson =
    patch.platforms !== undefined
      ? patch.platforms.length
        ? JSON.stringify(patch.platforms)
        : null
      : existing.platforms_json
  const releaseDate =
    patch.releaseDate !== undefined ? patch.releaseDate : existing.release_date
  const now = new Date().toISOString()

  await execute(
    `
    UPDATE video_clips
    SET status = ?, title = ?, artist = ?, file_url = ?, cover_url = ?,
        platforms_json = ?, release_date = ?, updated_at = ?
    WHERE id = ?
    `,
    [status, title, artist, fileUrl, coverUrl, platformsJson, releaseDate, now, id]
  )

  return toView({
    ...existing,
    status,
    title,
    artist,
    file_url: fileUrl,
    cover_url: coverUrl,
    platforms_json: platformsJson,
    release_date: releaseDate,
    updated_at: now,
  })
}

export async function ensureVideoClipFromOrder(input: {
  userId: string
  orderId: string
  title: string
  fileUrl?: string | null
  artist?: string
}): Promise<void> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM video_clips WHERE order_id = ? LIMIT 1`,
    [input.orderId]
  )
  if (existing) return

  const user = await getCabinetUserById(input.userId)
  const artist = input.artist?.trim() || user?.artistName?.trim() || "Без артиста"
  await createVideoClip({
    userId: input.userId,
    title: input.title.trim() || "Видеоклип",
    artist,
    orderId: input.orderId,
    fileUrl: input.fileUrl ?? null,
    status: "on_moderation",
  })
}
