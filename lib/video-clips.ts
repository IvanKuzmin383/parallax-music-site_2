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
  comment: string | null
  preview_timecode_sec: number | string | null
  status: string
  platforms_json: string | null
  apple_music_url: string | null
  yandex_music_url: string | null
  vk_url: string | null
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

function toIntOrNull(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : null
}

function platformsFromLinks(links: {
  appleMusic: string | null
  yandex: string | null
  vk: string | null
}): string[] {
  const out: string[] = []
  if (links.appleMusic) out.push("Apple Music")
  if (links.yandex) out.push("Яндекс Музыка")
  if (links.vk) out.push("VK")
  return out
}

function toView(row: ClipRow): VideoClipView {
  const platformLinks = {
    appleMusic: row.apple_music_url?.trim() || null,
    yandex: row.yandex_music_url?.trim() || null,
    vk: row.vk_url?.trim() || null,
  }
  const fromJson = parsePlatforms(row.platforms_json)
  const platforms =
    fromJson.length > 0 ? fromJson : platformsFromLinks(platformLinks)

  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    status: isStatus(row.status) ? row.status : "draft",
    trackId: row.track_id,
    orderId: row.order_id,
    fileUrl: row.file_url,
    coverUrl: row.cover_url,
    comment: row.comment?.trim() || null,
    previewTimecodeSec: toIntOrNull(row.preview_timecode_sec),
    platforms,
    platformLinks,
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
  comment?: string | null
  previewTimecodeSec?: number | null
  status?: VideoClipStatus
  platforms?: string[]
  releaseDate?: string | null
  appleMusicUrl?: string | null
  yandexMusicUrl?: string | null
  vkUrl?: string | null
}): Promise<VideoClipView> {
  const id = randomUUID()
  const now = new Date().toISOString()
  const status = input.status ?? "draft"
  const platformsJson =
    input.platforms && input.platforms.length > 0 ? JSON.stringify(input.platforms) : null
  const previewTimecodeSec =
    typeof input.previewTimecodeSec === "number" && Number.isFinite(input.previewTimecodeSec)
      ? Math.trunc(input.previewTimecodeSec)
      : null
  await execute(
    `
    INSERT INTO video_clips (
      id, user_id, title, artist, track_id, order_id, file_url, cover_url,
      comment, preview_timecode_sec, status, platforms_json,
      apple_music_url, yandex_music_url, vk_url,
      release_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      input.comment?.trim() || null,
      previewTimecodeSec,
      status,
      platformsJson,
      input.appleMusicUrl?.trim() || null,
      input.yandexMusicUrl?.trim() || null,
      input.vkUrl?.trim() || null,
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
    comment: input.comment?.trim() || null,
    preview_timecode_sec: previewTimecodeSec,
    status,
    platforms_json: platformsJson,
    apple_music_url: input.appleMusicUrl?.trim() || null,
    yandex_music_url: input.yandexMusicUrl?.trim() || null,
    vk_url: input.vkUrl?.trim() || null,
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
    comment?: string | null
    previewTimecodeSec?: number | null
    platforms?: string[]
    releaseDate?: string | null
    appleMusicUrl?: string | null
    yandexMusicUrl?: string | null
    vkUrl?: string | null
  }
): Promise<VideoClipView | null> {
  const existing = await queryOne<ClipRow>(`SELECT * FROM video_clips WHERE id = ?`, [id])
  if (!existing) return null

  const status = patch.status ?? (isStatus(existing.status) ? existing.status : "draft")
  const title = patch.title?.trim() || existing.title
  const artist = patch.artist?.trim() || existing.artist
  const fileUrl = patch.fileUrl !== undefined ? patch.fileUrl : existing.file_url
  const coverUrl = patch.coverUrl !== undefined ? patch.coverUrl : existing.cover_url
  const comment =
    patch.comment !== undefined ? patch.comment?.trim() || null : existing.comment
  const previewTimecodeSec =
    patch.previewTimecodeSec !== undefined
      ? typeof patch.previewTimecodeSec === "number" && Number.isFinite(patch.previewTimecodeSec)
        ? Math.trunc(patch.previewTimecodeSec)
        : null
      : toIntOrNull(existing.preview_timecode_sec)
  const platformsJson =
    patch.platforms !== undefined
      ? patch.platforms.length
        ? JSON.stringify(patch.platforms)
        : null
      : existing.platforms_json
  const releaseDate =
    patch.releaseDate !== undefined ? patch.releaseDate : existing.release_date
  const appleMusicUrl =
    patch.appleMusicUrl !== undefined
      ? patch.appleMusicUrl?.trim() || null
      : existing.apple_music_url
  const yandexMusicUrl =
    patch.yandexMusicUrl !== undefined
      ? patch.yandexMusicUrl?.trim() || null
      : existing.yandex_music_url
  const vkUrl =
    patch.vkUrl !== undefined ? patch.vkUrl?.trim() || null : existing.vk_url
  const now = new Date().toISOString()

  await execute(
    `
    UPDATE video_clips
    SET status = ?, title = ?, artist = ?, file_url = ?, cover_url = ?,
        comment = ?, preview_timecode_sec = ?,
        platforms_json = ?, apple_music_url = ?, yandex_music_url = ?, vk_url = ?,
        release_date = ?, updated_at = ?
    WHERE id = ?
    `,
    [
      status,
      title,
      artist,
      fileUrl,
      coverUrl,
      comment,
      previewTimecodeSec,
      platformsJson,
      appleMusicUrl,
      yandexMusicUrl,
      vkUrl,
      releaseDate,
      now,
      id,
    ]
  )

  return toView({
    ...existing,
    status,
    title,
    artist,
    file_url: fileUrl,
    cover_url: coverUrl,
    comment,
    preview_timecode_sec: previewTimecodeSec,
    platforms_json: platformsJson,
    apple_music_url: appleMusicUrl,
    yandex_music_url: yandexMusicUrl,
    vk_url: vkUrl,
    release_date: releaseDate,
    updated_at: now,
  })
}

export async function ensureVideoClipFromOrder(input: {
  userId: string
  orderId: string
  title: string
  fileUrl?: string | null
  comment?: string | null
  previewTimecodeSec?: number | null
  releaseDate?: string | null
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
    comment: input.comment ?? null,
    previewTimecodeSec: input.previewTimecodeSec ?? null,
    releaseDate: input.releaseDate ?? null,
    status: "on_moderation",
  })
}
