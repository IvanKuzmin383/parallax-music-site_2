import { getTrackBySmartlinkSlug, type Track } from "@/lib/tracks"

export const SMARTLINK_SLUG_REGEX = /^[a-zA-Z0-9_-]{6,20}$/

/** Публичный JPEG без query-string (Telegram не любит ?hash на og:image). */
export function smartlinkOgImagePath(slug: string): string {
  return `/s/${slug}/cover`
}

export function smartlinkOgImageUrl(slug: string, siteUrl?: string): string {
  const base = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  return new URL(smartlinkOgImagePath(slug), base).href
}

export async function getReleasedSmartlinkTrack(slug: string): Promise<Track | null> {
  if (!SMARTLINK_SLUG_REGEX.test(slug)) return null
  try {
    const track = await getTrackBySmartlinkSlug(slug)
    if (!track || track.status !== "released") return null
    if (!track.coverPath?.trim()) return null
    return track
  } catch (error) {
    console.error("[smartlink] getReleasedSmartlinkTrack error:", error)
    return null
  }
}
