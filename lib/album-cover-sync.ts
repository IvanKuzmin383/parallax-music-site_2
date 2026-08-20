import { promises as fs } from "fs"
import path from "path"
import { getAlbumById, updateAlbum } from "@/lib/albums"
import { getTracksByAlbumId, updateTrack } from "@/lib/tracks"

/**
 * Прописывает один файл обложки альбому и всем его трекам.
 * Файл `newCoverPath` уже должен лежать на диске (обычно `covers/album-{albumId}.ext`).
 * Старые файлы обложек, на которые больше никто не ссылается, удаляются.
 */
export async function applySharedAlbumCover(args: {
  albumId: string
  newCoverPath: string
}): Promise<{ coverPath: string; trackIds: string[] }> {
  const albumId = args.albumId.trim()
  const newCoverPath = args.newCoverPath.trim()
  if (!albumId || !newCoverPath) {
    throw new Error("albumId и newCoverPath обязательны")
  }

  const album = await getAlbumById(albumId)
  if (!album) {
    throw new Error("Альбом не найден")
  }

  const tracks = await getTracksByAlbumId(albumId)
  const oldPaths = new Set<string>()
  if (album.coverPath?.trim() && album.coverPath.trim() !== newCoverPath) {
    oldPaths.add(path.resolve(album.coverPath.trim()))
  }
  for (const track of tracks) {
    const p = track.coverPath?.trim()
    if (p && path.resolve(p) !== path.resolve(newCoverPath)) {
      oldPaths.add(path.resolve(p))
    }
  }

  await updateAlbum(albumId, { coverPath: newCoverPath })

  const trackIds: string[] = []
  for (const track of tracks) {
    const updated = await updateTrack(track.id, {
      coverPath: newCoverPath,
      needsAiCover: false,
    })
    if (updated) trackIds.push(updated.id)
  }

  for (const oldAbs of oldPaths) {
    try {
      await fs.unlink(oldAbs)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        console.error("[album-cover-sync] Failed to delete old cover:", oldAbs, error)
      }
    }
  }

  return { coverPath: newCoverPath, trackIds }
}

/** Путь к общей обложке альбома в каталоге covers. */
export function buildAlbumCoverAbsolutePath(coversDir: string, albumId: string, coverExt: string): string {
  const ext = coverExt.replace(/^\./, "").toLowerCase() || "jpg"
  const normalized = ext === "jpeg" ? "jpg" : ext
  return path.join(coversDir, `album-${albumId}.${normalized}`)
}
