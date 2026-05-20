import { getTrackBySmartlinkSlug, type Track } from "@/lib/tracks"

export const SMARTLINK_SLUG_REGEX = /^[a-zA-Z0-9_-]{6,20}$/

export function smartlinkOgImagePath(slug: string): string {
  return `/s/${slug}/opengraph-image`
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
