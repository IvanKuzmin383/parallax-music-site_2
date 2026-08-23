import { getAlbumById, updateAlbum } from "@/lib/albums"
import { getTracksByAlbumId, updateTrack } from "@/lib/tracks"

/**
 * Прописывает одну дату релиза альбому и всем его трекам.
 */
export async function applySharedAlbumReleaseDate(args: {
  albumId: string
  releaseDate: string
}): Promise<{ releaseDate: string; trackIds: string[] }> {
  const albumId = args.albumId.trim()
  const releaseDate = args.releaseDate.trim()
  if (!albumId || !releaseDate) {
    throw new Error("albumId и releaseDate обязательны")
  }

  const album = await getAlbumById(albumId)
  if (!album) {
    throw new Error("Альбом не найден")
  }

  await updateAlbum(albumId, { releaseDate })

  const tracks = await getTracksByAlbumId(albumId)
  const trackIds: string[] = []
  for (const track of tracks) {
    if (track.releaseDate === releaseDate) {
      trackIds.push(track.id)
      continue
    }
    const updated = await updateTrack(track.id, { releaseDate })
    if (updated) trackIds.push(updated.id)
  }

  return { releaseDate, trackIds }
}
