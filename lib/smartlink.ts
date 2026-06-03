import { getTrackBySmartlinkSlug, type Track } from "@/lib/tracks"
import { smartlinkPublicOgUrl } from "@/lib/smartlink-og-public"

export const SMARTLINK_SLUG_REGEX = /^[a-zA-Z0-9_-]{6,20}$/

/** На странице смартлинка (можно динамический /cover). */
export function smartlinkCoverPath(slug: string): string {
  return `/s/${slug}/cover`
}

/** og:image — статический .jpg (Telegram надёжнее, чем динамический route). */
export function smartlinkOgImagePath(slug: string): string {
  return `/og-covers/${slug}.jpg`
}

export function smartlinkOgImageUrl(slug: string, siteUrl?: string): string {
  return smartlinkPublicOgUrl(slug, siteUrl)
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
