import crypto from "crypto"
import { promises as fs } from "fs"
import path from "path"
import { execute, query, queryOne } from "@/lib/database"
import { normalizePlatformLinks, type PlatformLinks } from "@/lib/smartlink-platforms"
import { SMARTLINK_SLUG_REGEX } from "@/lib/smartlink"
import {
  DEFAULT_SMARTLINK_THEME,
  parseSmartlinkTheme,
  serializeSmartlinkTheme,
  type SmartlinkTheme,
} from "@/lib/smartlink-theme"
import { generateUniqueSmartlinkSlug, getUploadsBasePath, isSmartlinkSlugTaken } from "@/lib/tracks"
import {
  TOOLS_SMARTLINK_ACTIVE_DAYS,
} from "@/lib/tools-smartlink-pricing"

export type SmartlinkMode = "standalone" | "promo" | "release"
export type SmartlinkStatus = "draft" | "active" | "expired" | "disabled"

export type CabinetSmartlink = {
  id: string
  userId: string
  slug: string
  title: string
  artistName: string
  coverPath: string | null
  previewAudioPath: string | null
  platformLinks: PlatformLinks
  theme: SmartlinkTheme
  mode: SmartlinkMode
  status: SmartlinkStatus
  releaseId: string | null
  trackId: string | null
  paidUntil: string | null
  createdAt: string
  updatedAt: string
}

type SmartlinkRow = {
  id: string
  user_id: string
  slug: string
  title: string
  artist_name: string
  cover_path: string | null
  preview_audio_path: string | null
  platform_links: string | null
  theme_json: string | null
  mode: string
  status: string
  release_id: string | null
  track_id: string | null
  paid_until: string | null
  created_at: string
  updated_at: string
}

function parseLinks(raw: string | null | undefined): PlatformLinks {
  if (!raw?.trim()) return {}
  try {
    return normalizePlatformLinks(JSON.parse(raw) as PlatformLinks)
  } catch {
    return {}
  }
}

function rowToSmartlink(row: SmartlinkRow): CabinetSmartlink {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    title: row.title ?? "",
    artistName: row.artist_name ?? "",
    coverPath: row.cover_path?.trim() || null,
    previewAudioPath: row.preview_audio_path?.trim() || null,
    platformLinks: parseLinks(row.platform_links),
    theme: parseSmartlinkTheme(row.theme_json ? safeJson(row.theme_json) : DEFAULT_SMARTLINK_THEME),
    mode: (row.mode as SmartlinkMode) || "standalone",
    status: (row.status as SmartlinkStatus) || "draft",
    releaseId: row.release_id,
    trackId: row.track_id,
    paidUntil: row.paid_until,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function isSmartlinkPubliclyActive(link: CabinetSmartlink): boolean {
  if (link.status !== "active") return false
  if (!link.coverPath?.trim()) return false
  if (link.paidUntil) {
    const until = new Date(link.paidUntil).getTime()
    if (Number.isFinite(until) && until < Date.now()) return false
  }
  return true
}

export async function isAnySmartlinkSlugTaken(
  slug: string,
  opts?: { excludeTrackId?: string; excludeSmartlinkId?: string }
): Promise<boolean> {
  const trimmed = slug.trim()
  if (!trimmed) return false
  if (await isSmartlinkSlugTaken(trimmed, opts?.excludeTrackId)) return true
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM smartlinks WHERE LOWER(slug) = LOWER(?)`,
    [trimmed]
  )
  if (!row) return false
  if (opts?.excludeSmartlinkId && row.id === opts.excludeSmartlinkId) return false
  return true
}

export async function listSmartlinksByUserId(userId: string): Promise<CabinetSmartlink[]> {
  const rows = await query<SmartlinkRow>(
    `SELECT * FROM smartlinks WHERE user_id = ? ORDER BY updated_at DESC`,
    [userId]
  )
  return rows.map(rowToSmartlink)
}

export async function getSmartlinkById(id: string): Promise<CabinetSmartlink | null> {
  const row = await queryOne<SmartlinkRow>(`SELECT * FROM smartlinks WHERE id = ?`, [id])
  return row ? rowToSmartlink(row) : null
}

export async function getSmartlinkBySlug(slug: string): Promise<CabinetSmartlink | null> {
  if (!SMARTLINK_SLUG_REGEX.test(slug)) return null
  const row = await queryOne<SmartlinkRow>(
    `SELECT * FROM smartlinks WHERE LOWER(slug) = LOWER(?)`,
    [slug]
  )
  return row ? rowToSmartlink(row) : null
}

export async function createSmartlink(input: {
  userId: string
  title?: string
  artistName?: string
  mode?: SmartlinkMode
  releaseId?: string | null
  trackId?: string | null
  coverPath?: string | null
  previewAudioPath?: string | null
  platformLinks?: PlatformLinks
  theme?: SmartlinkTheme
}): Promise<CabinetSmartlink> {
  const id = crypto.randomUUID()
  let slug = await generateUniqueSmartlinkSlug()
  // generateUniqueSmartlinkSlug only checks tracks - ensure unique in smartlinks too
  for (let i = 0; i < 20; i++) {
    if (!(await isAnySmartlinkSlugTaken(slug))) break
    slug = await generateUniqueSmartlinkSlug()
  }
  const now = new Date().toISOString()
  const theme = input.theme ?? DEFAULT_SMARTLINK_THEME
  const links = normalizePlatformLinks(input.platformLinks ?? {})
  await execute(
    `
    INSERT INTO smartlinks (
      id, user_id, slug, title, artist_name, cover_path, preview_audio_path,
      platform_links, theme_json, mode, status, release_id, track_id, paid_until,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, NULL, ?, ?)
    `,
    [
      id,
      input.userId,
      slug,
      (input.title ?? "").trim() || "Без названия",
      (input.artistName ?? "").trim() || "",
      input.coverPath?.trim() || null,
      input.previewAudioPath?.trim() || null,
      JSON.stringify(links),
      serializeSmartlinkTheme(theme),
      input.mode ?? "standalone",
      input.releaseId ?? null,
      input.trackId ?? null,
      now,
      now,
    ]
  )
  const created = await getSmartlinkById(id)
  if (!created) throw new Error("Failed to create smartlink")
  return created
}

export async function updateSmartlink(
  id: string,
  patch: Partial<{
    slug: string
    title: string
    artistName: string
    coverPath: string | null
    previewAudioPath: string | null
    platformLinks: PlatformLinks
    theme: SmartlinkTheme
    mode: SmartlinkMode
    status: SmartlinkStatus
    releaseId: string | null
    trackId: string | null
    paidUntil: string | null
  }>
): Promise<CabinetSmartlink | null> {
  const current = await getSmartlinkById(id)
  if (!current) return null

  if (patch.slug !== undefined) {
    const slug = patch.slug.trim()
    if (!SMARTLINK_SLUG_REGEX.test(slug)) {
      throw new Error("invalid_slug")
    }
    // Свой текущий slug не считаем занятым
    if (slug.toLowerCase() !== current.slug.toLowerCase()) {
      if (await isAnySmartlinkSlugTaken(slug, { excludeSmartlinkId: id })) {
        throw new Error("slug_taken")
      }
    }
  }

  const next: CabinetSmartlink = {
    ...current,
    slug: patch.slug?.trim() ?? current.slug,
    title: patch.title !== undefined ? patch.title.trim() || "Без названия" : current.title,
    artistName: patch.artistName !== undefined ? patch.artistName.trim() : current.artistName,
    coverPath: patch.coverPath !== undefined ? patch.coverPath : current.coverPath,
    previewAudioPath:
      patch.previewAudioPath !== undefined ? patch.previewAudioPath : current.previewAudioPath,
    platformLinks:
      patch.platformLinks !== undefined
        ? normalizePlatformLinks(patch.platformLinks)
        : current.platformLinks,
    theme: patch.theme ?? current.theme,
    mode: patch.mode ?? current.mode,
    status: patch.status ?? current.status,
    releaseId: patch.releaseId !== undefined ? patch.releaseId : current.releaseId,
    trackId: patch.trackId !== undefined ? patch.trackId : current.trackId,
    paidUntil: patch.paidUntil !== undefined ? patch.paidUntil : current.paidUntil,
    updatedAt: new Date().toISOString(),
  }

  await execute(
    `
    UPDATE smartlinks SET
      slug = ?, title = ?, artist_name = ?, cover_path = ?, preview_audio_path = ?,
      platform_links = ?, theme_json = ?, mode = ?, status = ?, release_id = ?, track_id = ?,
      paid_until = ?, updated_at = ?
    WHERE id = ?
    `,
    [
      next.slug,
      next.title,
      next.artistName,
      next.coverPath,
      next.previewAudioPath,
      JSON.stringify(next.platformLinks),
      serializeSmartlinkTheme(next.theme),
      next.mode,
      next.status,
      next.releaseId,
      next.trackId,
      next.paidUntil,
      next.updatedAt,
      id,
    ]
  )
  return getSmartlinkById(id)
}

export async function activateSmartlinkPaid(id: string): Promise<CabinetSmartlink | null> {
  const until = new Date()
  until.setDate(until.getDate() + TOOLS_SMARTLINK_ACTIVE_DAYS)
  return updateSmartlink(id, {
    status: "active",
    paidUntil: until.toISOString(),
  })
}

/** Каталог загрузок именно этого смартлинка (не файлы релиза/трека). */
function smartlinkOwnedUploadsDir(uploadsBase: string, smartlinkId: string): string | null {
  const id = smartlinkId.trim()
  if (!id || id.includes("..") || id.includes("/") || id.includes("\\")) return null
  const root = path.resolve(uploadsBase, "smartlinks")
  const dir = path.resolve(root, id)
  const rel = path.relative(root, dir)
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null
  return dir
}

/**
 * Удаляет смартлинк из БД и свои файлы с диска (`uploads/smartlinks/{id}`).
 * Обложку/аудио релиза (пути вне этой папки) не трогает.
 */
export async function deleteSmartlink(id: string, userId: string): Promise<boolean> {
  const current = await getSmartlinkById(id)
  if (!current || current.userId !== userId) return false

  const uploadsBase = await getUploadsBasePath()
  const ownedDir = smartlinkOwnedUploadsDir(uploadsBase, id)

  await execute(`DELETE FROM smartlinks WHERE id = ? AND user_id = ?`, [id, userId])

  if (ownedDir) {
    await fs.rm(ownedDir, { recursive: true, force: true }).catch(() => undefined)
  }

  return true
}

export async function smartlinkUploadsDir(smartlinkId: string): Promise<string> {
  const base = await getUploadsBasePath()
  const dir = path.join(base, "smartlinks", smartlinkId)
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export function coverUrlForSmartlink(link: CabinetSmartlink): string | null {
  if (!link.coverPath?.trim()) return null
  return `/api/cabinet/tools/smartlinks/${encodeURIComponent(link.id)}/cover`
}

export function previewAudioUrlForSmartlink(link: CabinetSmartlink): string | null {
  if (!link.previewAudioPath?.trim()) return null
  return `/api/cabinet/tools/smartlinks/${encodeURIComponent(link.id)}/audio`
}

export function publicCoverUrlForSmartlinkSlug(slug: string): string {
  return `/s/${encodeURIComponent(slug)}/opengraph-image`
}
