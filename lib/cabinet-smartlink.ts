import { getReleaseById } from "@/lib/releases"
import {
  generateUniqueSmartlinkSlug,
  getTrackById,
  getTracksByAlbumId,
  getTracksByReleaseId,
  type Track,
} from "@/lib/tracks"
import {
  PLATFORM_LINK_KEYS,
  normalizePlatformLinks,
  type PlatformLinks,
} from "@/lib/smartlink-platforms"
import {
  DEFAULT_SMARTLINK_THEME,
  parseSmartlinkTheme,
  type SmartlinkTheme,
} from "@/lib/smartlink-theme"

export type CabinetSmartlinkContext = {
  releaseId: string | null
  track: Track
  tracks: Track[]
  title: string
  artist: string
  coverUrl: string | null
  status: string
  theme: SmartlinkTheme
  platformLinks: PlatformLinks
  smartlinkSlug: string | null
}

function mergePlatformLinks(tracks: Track[]): PlatformLinks {
  const merged: PlatformLinks = {}
  for (const track of tracks) {
    const links = track.platformLinks
    if (!links) continue
    for (const key of PLATFORM_LINK_KEYS) {
      const url = links[key]?.trim()
      if (url && !merged[key]) merged[key] = url
    }
  }
  return merged
}

function resolveEditablePlatformLinks(primary: Track, tracks: Track[]): PlatformLinks {
  const own = normalizePlatformLinks(primary.platformLinks)
  if (PLATFORM_LINK_KEYS.some((key) => Boolean(own[key]))) return own
  return mergePlatformLinks(tracks)
}

function pickSmartlinkTrack(tracks: Track[]): Track | null {
  if (tracks.length === 0) return null
  const withSlug = tracks.find((t) => t.smartlinkSlug?.trim())
  if (withSlug) return withSlug
  const withLinks = tracks.find((t) =>
    PLATFORM_LINK_KEYS.some((key) => Boolean(t.platformLinks?.[key]?.trim())),
  )
  return withLinks ?? tracks[0]
}

function coverUrlFor(track: Track, releaseId: string | null): string | null {
  if (!track.coverPath?.trim()) return null
  if (releaseId) return `/api/cabinet/releases/${releaseId}/cover`
  if (track.releaseId) return `/api/cabinet/releases/${track.releaseId}/cover`
  return `/api/cabinet/uploads/cover/${track.id}`
}

export async function resolveCabinetSmartlinkContext(
  id: string,
  userEmail: string,
): Promise<CabinetSmartlinkContext | null> {
  const email = userEmail.toLowerCase()

  const release = await getReleaseById(id)
  if (release && release.userId.toLowerCase() === email) {
    const tracks = await getTracksByReleaseId(release.id)
    const track = pickSmartlinkTrack(tracks)
    if (!track) return null
    return {
      releaseId: release.id,
      track,
      tracks,
      title: release.title || track.trackName,
      artist: release.artistName || track.artistName,
      coverUrl: release.coverPath
        ? `/api/cabinet/releases/${release.id}/cover`
        : coverUrlFor(track, release.id),
      status: release.status,
      theme: parseSmartlinkTheme(track.smartlinkTheme ?? DEFAULT_SMARTLINK_THEME),
      platformLinks: resolveEditablePlatformLinks(track, tracks),
      smartlinkSlug: track.smartlinkSlug?.trim() || null,
    }
  }

  const single = await getTrackById(id)
  if (!single || single.userId.toLowerCase() !== email) return null

  let tracks: Track[] = [single]
  if (single.releaseId) {
    tracks = await getTracksByReleaseId(single.releaseId)
  } else if (single.albumId) {
    tracks = await getTracksByAlbumId(single.albumId)
    tracks = tracks.sort((a, b) => (a.trackOrder ?? 0) - (b.trackOrder ?? 0))
  }

  const track = pickSmartlinkTrack(tracks) ?? single
  const releaseId = track.releaseId ?? single.releaseId ?? null
  return {
    releaseId,
    track,
    tracks,
    title: track.trackName,
    artist: track.artistName,
    coverUrl: coverUrlFor(track, releaseId),
    status: track.status,
    theme: parseSmartlinkTheme(track.smartlinkTheme ?? DEFAULT_SMARTLINK_THEME),
    platformLinks: resolveEditablePlatformLinks(track, tracks),
    smartlinkSlug: track.smartlinkSlug?.trim() || null,
  }
}

export async function ensureSmartlinkSlugOnTrack(track: Track): Promise<string> {
  const existing = track.smartlinkSlug?.trim()
  if (existing) return existing
  return generateUniqueSmartlinkSlug()
}
