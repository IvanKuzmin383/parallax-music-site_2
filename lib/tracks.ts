import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import { nanoid } from "nanoid"
import type { TrackGenre, TrackMood, TrackStreamingScope } from "./track-constants"
import { normalizeStreamingScope } from "./track-constants"
import type { PlatformLinks } from "./smartlink-platforms"
import { query, queryOne, execute, normalizePgTimestamptz } from "./database"
export {
  GENRES,
  TRACK_MOODS,
  STREAMING_SCOPES,
  STREAMING_SCOPE_OPTIONS,
  normalizeStreamingScope,
  type TrackGenre,
  type TrackMood,
  type TrackStreamingScope,
} from "./track-constants"

export type TrackStatus =
  | "upload_pending"
  | "on_moderation"
  | "sent_to_platforms"
  | "approved_by_platforms"
  | "released"
  | "rejected"
  | "postponed"

export interface Track {
  id: string
  userId: string
  albumId?: string
  trackName: string
  artistName: string
  labelName: string
  genre: TrackGenre
  mood: TrackMood | ""
  shortDescription: string
  lyricsText: string
  musicAuthor: string
  lyricsAuthor: string
  musicRights: string
  musicAiService: string
  lyricsRights: string
  performanceRights: string
  isInstrumental: boolean
  backingAuthor: string
  /** С какой секунды начинать звук в TikTok (0 = с начала). */
  tiktokSoundStartSec?: number | null
  coverPath: string
  /** Пользователь заказал ИИ-обложку; файла обложки ещё нет (coverPath может быть пустым). */
  needsAiCover: boolean
  audioPath: string
  status: TrackStatus
  releaseDate?: string
  moderationNote?: string | null
  upc?: string | null
  isrc?: string | null
  /** Релиз перенесён с другого дистрибьютора (ожидаются UPC и ISRC) */
  transferFromOtherDistributor?: boolean
  /** Область дистрибуции на стриминг-площадках */
  streamingScope: TrackStreamingScope
  smartlinkSlug?: string
  platformLinks?: PlatformLinks
  /** Списан ли Fix-слот при отправке на модерацию (новый тариф Fix). */
  fixPackCreditsCharged: boolean
  createdAt: string
  updatedAt: string
}

export interface TrackRow {
  id: string
  user_id: string
  album_id: string | null
  track_name: string
  artist_name: string
  label_name: string | null
  genre: string
  mood: string | null
  short_description: string | null
  lyrics_text: string | null
  music_author: string | null
  lyrics_author: string | null
  music_rights: string | null
  music_ai_service: string | null
  lyrics_rights: string | null
  performance_rights: string | null
  is_instrumental: boolean | null
  backing_author: string | null
  tiktok_sound_start_sec: number | null
  cover_path: string
  needs_ai_cover?: boolean | null
  audio_path: string
  status: string
  release_date: string | null
  moderation_note: string | null
  upc: string | null
  isrc: string | null
  transfer_from_other_distributor?: boolean | null
  streaming_scope?: string | null
  smartlink_slug: string | null
  platform_links: string | null
  fix_pack_credits_charged?: boolean | null
  created_at: string
  updated_at: string
}

export function rowToTrack(row: TrackRow): Track {
  let platformLinks: PlatformLinks | undefined
  if (row.platform_links && row.platform_links.trim()) {
    try {
      platformLinks = JSON.parse(row.platform_links) as PlatformLinks
    } catch {
      platformLinks = undefined
    }
  }
  return {
    id: row.id,
    userId: row.user_id,
    albumId: row.album_id ?? undefined,
    trackName: row.track_name,
    artistName: row.artist_name,
    labelName: row.label_name ?? "Parallax Music",
    genre: row.genre as TrackGenre,
    mood: (row.mood ?? "") as TrackMood | "",
    shortDescription: row.short_description ?? "",
    lyricsText: row.lyrics_text ?? "",
    musicAuthor: row.music_author ?? "",
    lyricsAuthor: row.lyrics_author ?? "",
    musicRights: row.music_rights ?? "",
    musicAiService: row.music_ai_service ?? "",
    lyricsRights: row.lyrics_rights ?? "",
    performanceRights: row.performance_rights ?? "",
    isInstrumental: row.is_instrumental === true,
    backingAuthor: row.backing_author ?? "",
    tiktokSoundStartSec:
      row.tiktok_sound_start_sec == null || !Number.isFinite(Number(row.tiktok_sound_start_sec))
        ? null
        : Math.trunc(Number(row.tiktok_sound_start_sec)),
    coverPath: row.cover_path,
    needsAiCover: row.needs_ai_cover === true,
    audioPath: row.audio_path,
    status: row.status as TrackStatus,
    releaseDate: row.release_date ?? undefined,
    moderationNote: row.moderation_note ?? null,
    upc: row.upc ?? undefined,
    isrc: row.isrc ?? undefined,
    transferFromOtherDistributor: row.transfer_from_other_distributor === true,
    streamingScope: normalizeStreamingScope(row.streaming_scope),
    smartlinkSlug: row.smartlink_slug ?? undefined,
    platformLinks,
    fixPackCreditsCharged: row.fix_pack_credits_charged === true,
    createdAt: normalizePgTimestamptz(row.created_at),
    updatedAt: normalizePgTimestamptz(row.updated_at),
  }
}

let cachedUploadsBasePath: string | null = null

export async function getUploadsBasePath(): Promise<string> {
  if (cachedUploadsBasePath) return cachedUploadsBasePath

  if (process.env.AMVERA_DATA_PATH === "true" || process.env.USE_AMVERA_DATA === "true") {
    cachedUploadsBasePath = path.posix.join("/data", "uploads")
    return cachedUploadsBasePath
  }

  try {
    await fs.access("/data")
    cachedUploadsBasePath = path.posix.join("/data", "uploads")
    return cachedUploadsBasePath
  } catch {
    cachedUploadsBasePath = path.join(process.cwd(), "data", "uploads")
    return cachedUploadsBasePath
  }
}

export async function getAudioDir(): Promise<string> {
  const base = await getUploadsBasePath()
  const dir = path.join(base, "audio")
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
  return dir
}

export async function getCoversDir(): Promise<string> {
  const base = await getUploadsBasePath()
  const dir = path.join(base, "covers")
  try {
    await fs.access(dir)
  } catch {
    await fs.mkdir(dir, { recursive: true })
  }
  return dir
}

export async function getAllTracks(): Promise<Track[]> {
  const rows = await query<TrackRow>("SELECT * FROM tracks")
  return rows.map(rowToTrack)
}

export async function getTracksByUserId(userId: string): Promise<Track[]> {
  const rows = await query<TrackRow>("SELECT * FROM tracks WHERE LOWER(user_id) = LOWER(?)", [userId])
  return rows.map(rowToTrack)
}

export async function getTrackById(id: string): Promise<Track | null> {
  const row = await queryOne<TrackRow>("SELECT * FROM tracks WHERE id = ?", [id])
  return row ? rowToTrack(row) : null
}

export async function getTrackBySmartlinkSlug(slug: string): Promise<Track | null> {
  const row = await queryOne<TrackRow>("SELECT * FROM tracks WHERE smartlink_slug = ?", [slug])
  return row ? rowToTrack(row) : null
}

export async function getTracksByAlbumId(albumId: string): Promise<Track[]> {
  const rows = await query<TrackRow>("SELECT * FROM tracks WHERE album_id = ?", [albumId])
  return rows.map(rowToTrack)
}

export async function updateTracksByAlbumId(
  albumId: string,
  partial: {
    upc?: string | null
    platformLinks?: PlatformLinks
    status?: TrackStatus
    moderationNote?: string | null
  }
): Promise<Track[]> {
  const trackIds = (await getTracksByAlbumId(albumId)).map((t) => t.id)
  const updated: Track[] = []
  for (const id of trackIds) {
    const t = await updateTrack(id, partial)
    if (t) updated.push(t)
  }
  return updated
}

function hasAnyPlatformLink(links?: PlatformLinks): boolean {
  if (!links) return false
  const values = Object.values(links) as (string | undefined)[]
  return values.some((v) => typeof v === "string" && v.trim().length > 0)
}

async function generateUniqueSmartlinkSlug(): Promise<string> {
  const existing = await query<{ smartlink_slug: string }>(
    "SELECT smartlink_slug FROM tracks WHERE smartlink_slug IS NOT NULL"
  )
  const set = new Set(existing.map((r) => r.smartlink_slug))
  for (let i = 0; i < 100; i++) {
    const slug = nanoid(10)
    if (!set.has(slug)) return slug
  }
  return nanoid(10)
}

export async function isSmartlinkSlugTaken(slug: string, excludeTrackId?: string): Promise<boolean> {
  const trimmed = slug.trim()
  if (!trimmed) return false
  const row = await queryOne<{ id: string }>("SELECT id FROM tracks WHERE smartlink_slug = ?", [trimmed])
  if (!row) return false
  if (excludeTrackId && row.id === excludeTrackId) return false
  return true
}

export type CreateTrackInput = Omit<
  Track,
  "id" | "createdAt" | "updatedAt" | "needsAiCover" | "fixPackCreditsCharged" | "streamingScope"
> & {
  needsAiCover?: boolean
  fixPackCreditsCharged?: boolean
  streamingScope?: TrackStreamingScope
}

export async function setTrackFixPackCreditsCharged(id: string, charged: boolean): Promise<void> {
  const now = new Date().toISOString()
  await execute("UPDATE tracks SET fix_pack_credits_charged = ?, updated_at = ? WHERE id = ?", [
    charged,
    now,
    id,
  ])
}

export async function createTrack(data: CreateTrackInput): Promise<Track> {
  const now = new Date().toISOString()
  const track: Track = {
    ...data,
    needsAiCover: data.needsAiCover ?? false,
    transferFromOtherDistributor: data.transferFromOtherDistributor ?? false,
    streamingScope: data.streamingScope ?? "all",
    fixPackCreditsCharged: data.fixPackCreditsCharged ?? false,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  }

  await execute(
    `
    INSERT INTO tracks (id, user_id, album_id, track_name, artist_name, label_name, genre, mood, short_description, lyrics_text, music_author, lyrics_author, music_rights, music_ai_service, lyrics_rights, performance_rights, is_instrumental, backing_author, tiktok_sound_start_sec, cover_path, audio_path, status, release_date, moderation_note, upc, isrc, transfer_from_other_distributor, streaming_scope, smartlink_slug, platform_links, needs_ai_cover, fix_pack_credits_charged, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      track.id,
      track.userId,
      track.albumId ?? null,
      track.trackName,
      track.artistName,
      track.labelName,
      track.genre,
      track.mood ?? null,
      track.shortDescription ?? null,
      track.lyricsText ?? null,
      track.musicAuthor ?? null,
      track.lyricsAuthor ?? null,
      track.musicRights ?? null,
      track.musicAiService ?? null,
      track.lyricsRights ?? null,
      track.performanceRights ?? null,
      track.isInstrumental,
      track.backingAuthor ?? null,
      track.tiktokSoundStartSec ?? null,
      track.coverPath,
      track.audioPath,
      track.status,
      track.releaseDate ?? null,
      track.moderationNote ?? null,
      track.upc ?? null,
      track.isrc ?? null,
      track.transferFromOtherDistributor,
      track.streamingScope,
      track.smartlinkSlug ?? null,
      track.platformLinks ? JSON.stringify(track.platformLinks) : null,
      track.needsAiCover,
      track.fixPackCreditsCharged,
      track.createdAt,
      track.updatedAt,
    ]
  )

  if (process.env.NODE_ENV === "development") {
    console.log("[tracks] Created track", { id: track.id, userId: track.userId, trackName: track.trackName })
  }

  return track
}

export async function updateTrack(
  id: string,
  partial: Partial<Omit<Track, "id" | "createdAt">>
): Promise<Track | null> {
  const current = await getTrackById(id)
  if (!current) return null

  if (partial.status !== undefined && partial.status !== current.status) {
    const { handleFixPackCreditsOnTrackStatusChange } = await import(
      "@/lib/fix-pack-moderation-credits"
    )
    await handleFixPackCreditsOnTrackStatusChange(current, partial.status)
    if (partial.status === "rejected" && current.fixPackCreditsCharged) {
      partial = { ...partial, fixPackCreditsCharged: false }
    }
  }

  const hasIncomingSmartlinkSlug = Object.prototype.hasOwnProperty.call(partial, "smartlinkSlug")
  const incomingSmartlinkSlug = hasIncomingSmartlinkSlug
    ? typeof partial.smartlinkSlug === "string"
      ? partial.smartlinkSlug.trim()
      : ""
    : undefined

  let smartlinkSlug =
    hasIncomingSmartlinkSlug && incomingSmartlinkSlug !== undefined
      ? incomingSmartlinkSlug || undefined
      : current.smartlinkSlug

  const nextPlatformLinks = partial.platformLinks ?? current.platformLinks
  const shouldAutoGenerateSmartlink =
    !smartlinkSlug &&
    (hasAnyPlatformLink(nextPlatformLinks) ||
      ((partial.status ?? current.status) === "released" && hasAnyPlatformLink(current.platformLinks)))

  if (shouldAutoGenerateSmartlink) {
    smartlinkSlug = await generateUniqueSmartlinkSlug()
  }

  const updated: Track = {
    ...current,
    ...partial,
    smartlinkSlug,
    updatedAt: new Date().toISOString(),
  }

  await execute(
    `
    UPDATE tracks SET user_id = ?, album_id = ?, track_name = ?, artist_name = ?, label_name = ?, genre = ?, mood = ?, short_description = ?, lyrics_text = ?, music_author = ?, lyrics_author = ?, music_rights = ?, music_ai_service = ?, lyrics_rights = ?, performance_rights = ?, is_instrumental = ?, backing_author = ?, tiktok_sound_start_sec = ?, cover_path = ?, audio_path = ?, status = ?, release_date = ?, moderation_note = ?, upc = ?, isrc = ?, transfer_from_other_distributor = ?, streaming_scope = ?, smartlink_slug = ?, platform_links = ?, needs_ai_cover = ?, fix_pack_credits_charged = ?, updated_at = ?
    WHERE id = ?
  `,
    [
      updated.userId,
      updated.albumId ?? null,
      updated.trackName,
      updated.artistName,
      updated.labelName,
      updated.genre,
      updated.mood ?? null,
      updated.shortDescription ?? null,
      updated.lyricsText ?? null,
      updated.musicAuthor ?? null,
      updated.lyricsAuthor ?? null,
      updated.musicRights ?? null,
      updated.musicAiService ?? null,
      updated.lyricsRights ?? null,
      updated.performanceRights ?? null,
      updated.isInstrumental,
      updated.backingAuthor ?? null,
      updated.tiktokSoundStartSec ?? null,
      updated.coverPath,
      updated.audioPath,
      updated.status,
      updated.releaseDate ?? null,
      updated.moderationNote ?? null,
      updated.upc ?? null,
      updated.isrc ?? null,
      updated.transferFromOtherDistributor,
      updated.streamingScope,
      updated.smartlinkSlug ?? null,
      updated.platformLinks ? JSON.stringify(updated.platformLinks) : null,
      updated.needsAiCover,
      updated.fixPackCreditsCharged,
      updated.updatedAt,
      id,
    ]
  )

  if (process.env.NODE_ENV === "development") {
    console.log("[tracks] Updated track", { id: updated.id, status: updated.status })
  }

  return getTrackById(id)
}

export async function deleteTrack(id: string): Promise<boolean> {
  const track = await getTrackById(id)
  if (!track) return false

  try {
    try {
      await fs.unlink(track.audioPath)
      if (process.env.NODE_ENV === "development") {
        console.log("[tracks] Deleted audio file:", track.audioPath)
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[tracks] Error deleting audio file:", error)
      }
    }

    if (!track.albumId && track.coverPath.trim()) {
      try {
        await fs.unlink(track.coverPath)
        if (process.env.NODE_ENV === "development") {
          console.log("[tracks] Deleted cover file:", track.coverPath)
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          console.error("[tracks] Error deleting cover file:", error)
        }
      }
    }
  } catch (error) {
    console.error("[tracks] Error deleting track files:", error)
  }

  const changes = await execute("DELETE FROM tracks WHERE id = ?", [id])

  if (process.env.NODE_ENV === "development" && changes > 0) {
    console.log("[tracks] Deleted track", { id: track.id, trackName: track.trackName })
  }

  return changes > 0
}
