import { getSmartlinkBySlug, isSmartlinkPubliclyActive } from "@/lib/cabinet-smartlinks"
import type { PlatformLinks } from "@/lib/smartlink-platforms"
import {
  DEFAULT_SMARTLINK_THEME,
  parseSmartlinkTheme,
  type SmartlinkTheme,
} from "@/lib/smartlink-theme"
import { getTrackBySmartlinkSlug, type Track } from "@/lib/tracks"

export const SMARTLINK_SLUG_REGEX = /^[a-zA-Z0-9_-]{6,20}$/

/** Статусы трека, для которых можно включить промо-смартлинк до релиза. */
export const SMARTLINK_PROMO_TRACK_STATUSES = [
  "on_moderation",
  "sent_to_platforms",
  "approved_by_platforms",
] as const

export function smartlinkOgImagePath(slug: string): string {
  return `/s/${slug}/opengraph-image`
}

export type PublicSmartlinkSource = "track" | "standalone"

export type PublicSmartlink = {
  source: PublicSmartlinkSource
  id: string
  slug: string
  title: string
  artistName: string
  coverPath: string
  audioPath: string | null
  platformLinks: PlatformLinks
  theme: SmartlinkTheme
  /** Для кэша OG */
  cacheKey: string
}

function trackIsPromoEligible(track: Track): boolean {
  if (track.status === "released") return true
  if (!track.smartlinkPublic) return false
  return (SMARTLINK_PROMO_TRACK_STATUSES as readonly string[]).includes(track.status)
}

/** Публичный трек-смартлинк: released или promo-флаг на подходящем статусе. */
export async function getReleasedSmartlinkTrack(slug: string): Promise<Track | null> {
  if (!SMARTLINK_SLUG_REGEX.test(slug)) return null
  try {
    const track = await getTrackBySmartlinkSlug(slug)
    if (!track) return null
    if (!track.coverPath?.trim()) return null
    if (!trackIsPromoEligible(track)) return null
    return track
  } catch (error) {
    console.error("[smartlink] getReleasedSmartlinkTrack error:", error)
    return null
  }
}

/** Единый резолвер публичной страницы: standalone smartlinks или трек. */
export async function getPublicSmartlink(slug: string): Promise<PublicSmartlink | null> {
  if (!SMARTLINK_SLUG_REGEX.test(slug)) return null

  try {
    const standalone = await getSmartlinkBySlug(slug)
    if (standalone && isSmartlinkPubliclyActive(standalone) && standalone.coverPath?.trim()) {
      return {
        source: "standalone",
        id: standalone.id,
        slug: standalone.slug,
        title: standalone.title,
        artistName: standalone.artistName,
        coverPath: standalone.coverPath,
        audioPath: standalone.previewAudioPath,
        platformLinks: standalone.platformLinks,
        theme: standalone.theme,
        cacheKey: `sl-${standalone.id}`,
      }
    }

    const track = await getReleasedSmartlinkTrack(slug)
    if (!track?.coverPath?.trim() || !track.smartlinkSlug?.trim()) return null
    return {
      source: "track",
      id: track.id,
      slug: track.smartlinkSlug,
      title: track.trackName,
      artistName: track.artistName,
      coverPath: track.coverPath,
      audioPath: track.audioPath?.trim() || null,
      platformLinks: track.platformLinks ?? {},
      theme: parseSmartlinkTheme(track.smartlinkTheme ?? DEFAULT_SMARTLINK_THEME),
      cacheKey: `tr-${track.id}`,
    }
  } catch (error) {
    console.error("[smartlink] getPublicSmartlink error:", error)
    return null
  }
}
