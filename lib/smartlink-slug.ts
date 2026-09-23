import { nanoid } from "nanoid"
import { query, queryOne } from "@/lib/database"

/** Уникальный slug среди tracks и albums. */
export async function generateUniqueSmartlinkSlug(): Promise<string> {
  const trackRows = await query<{ smartlink_slug: string }>(
    "SELECT smartlink_slug FROM tracks WHERE smartlink_slug IS NOT NULL"
  )
  const albumRows = await query<{ smartlink_slug: string }>(
    "SELECT smartlink_slug FROM albums WHERE smartlink_slug IS NOT NULL"
  )
  const set = new Set([
    ...trackRows.map((r) => r.smartlink_slug),
    ...albumRows.map((r) => r.smartlink_slug),
  ])
  for (let i = 0; i < 100; i++) {
    const slug = nanoid(10)
    if (!set.has(slug)) return slug
  }
  return nanoid(10)
}

export async function isSmartlinkSlugTaken(
  slug: string,
  opts?: { excludeTrackId?: string; excludeAlbumId?: string }
): Promise<boolean> {
  const trimmed = slug.trim()
  if (!trimmed) return false

  const track = await queryOne<{ id: string }>(
    "SELECT id FROM tracks WHERE smartlink_slug = ?",
    [trimmed]
  )
  if (track && track.id !== opts?.excludeTrackId) return true

  const album = await queryOne<{ id: string }>(
    "SELECT id FROM albums WHERE smartlink_slug = ?",
    [trimmed]
  )
  if (album && album.id !== opts?.excludeAlbumId) return true

  return false
}
