import { getAlbumBySmartlinkSlug, type Album } from "@/lib/albums"
import type { PlatformLinks } from "@/lib/smartlink-platforms"
import { getTrackBySmartlinkSlug, getTracksByAlbumId, type Track } from "@/lib/tracks"

export const SMARTLINK_SLUG_REGEX = /^[a-zA-Z0-9_-]{6,20}$/

export function smartlinkOgImagePath(slug: string): string {
  return `/s/${slug}/opengraph-image`
}

export type SmartlinkRelease = {
  kind: "album" | "track"
  id: string
  title: string
  artistName: string
  coverPath: string
  platformLinks?: PlatformLinks
  albumId?: string
}

function albumHasReleasedTrack(tracks: Track[]): boolean {
  return tracks.some((t) => t.status === "released")
}

export async function getReleasedSmartlinkRelease(slug: string): Promise<SmartlinkRelease | null> {
  if (!SMARTLINK_SLUG_REGEX.test(slug)) return null
  try {
    const album = await getAlbumBySmartlinkSlug(slug)
    if (album) {
      if (!album.coverPath?.trim()) return null
      const tracks = await getTracksByAlbumId(album.id)
      if (!albumHasReleasedTrack(tracks)) return null
      return {
        kind: "album",
        id: album.id,
        title: album.title,
        artistName: album.artistName,
        coverPath: album.coverPath,
        platformLinks: album.platformLinks,
        albumId: album.id,
      }
    }

    const track = await getTrackBySmartlinkSlug(slug)
    if (!track || track.status !== "released") return null
    if (!track.coverPath?.trim()) return null
    // Старые slug треков альбома: показываем альбом, если он уже есть.
    if (track.albumId) {
      const { getAlbumById } = await import("@/lib/albums")
      const parent = await getAlbumById(track.albumId)
      if (parent?.smartlinkSlug) {
        return {
          kind: "album",
          id: parent.id,
          title: parent.title,
          artistName: parent.artistName,
          coverPath: parent.coverPath || track.coverPath,
          platformLinks: parent.platformLinks ?? track.platformLinks,
          albumId: parent.id,
        }
      }
      if (parent) {
        return {
          kind: "album",
          id: parent.id,
          title: parent.title,
          artistName: parent.artistName,
          coverPath: parent.coverPath || track.coverPath,
          platformLinks: parent.platformLinks ?? track.platformLinks,
          albumId: parent.id,
        }
      }
    }
    return {
      kind: "track",
      id: track.id,
      title: track.trackName,
      artistName: track.artistName,
      coverPath: track.coverPath,
      platformLinks: track.platformLinks,
    }
  } catch (error) {
    console.error("[smartlink] getReleasedSmartlinkRelease error:", error)
    return null
  }
}

/** @deprecated Используйте getReleasedSmartlinkRelease */
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

export type { Album }
