import { stat } from "node:fs/promises"
import path from "node:path"
import sharp from "sharp"
import {
  buildCoverDerivativeCachePath,
  readCoverDerivativeCache,
  writeCoverDerivativeCacheAtomically,
} from "@/lib/cover-derivative-cache"
import {
  cabinetCoverSharpSemaphore,
  ensureCabinetCoverSharpConfigured,
} from "@/lib/cover-sharp-config"
import { getReleasedSmartlinkTrack } from "@/lib/smartlink"

ensureCabinetCoverSharpConfigured()

/** Квадрат 1:1 — как исходные обложки; для og:image и /s/[slug]/cover. */
export const SMARTLINK_OG_WIDTH = 1200
export const SMARTLINK_OG_HEIGHT = 1200
export const SMARTLINK_OG_QUALITY = 82

async function renderOgJpeg(
  coverPath: string,
  width: number,
  height: number,
  quality: number
): Promise<Buffer> {
  return sharp(coverPath, { sequentialRead: true })
    .rotate()
    .resize({ width, height, fit: "cover", position: "centre" })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer()
}

/**
 * JPEG 1200×1200 для OG (кэш рядом с обложками). null — трек не найден или нет файла.
 */
export async function renderSmartlinkOgCoverBuffer(slug: string): Promise<Buffer | null> {
  const track = await getReleasedSmartlinkTrack(slug)
  if (!track) return null

  try {
    const srcStat = await stat(track.coverPath)
    const coversDir = path.dirname(track.coverPath)
    const cachePath = buildCoverDerivativeCachePath({
      coversDir,
      trackId: `smartlink-og-1200sq-${track.id}`,
      width: SMARTLINK_OG_WIDTH,
      quality: SMARTLINK_OG_QUALITY,
      format: "jpeg",
      sourceMtimeMs: srcStat.mtimeMs,
    })

    let buffer = await readCoverDerivativeCache(cachePath)
    if (!buffer) {
      buffer = await cabinetCoverSharpSemaphore.runExclusive(() =>
        renderOgJpeg(
          track.coverPath,
          SMARTLINK_OG_WIDTH,
          SMARTLINK_OG_HEIGHT,
          SMARTLINK_OG_QUALITY
        )
      )
      await writeCoverDerivativeCacheAtomically(cachePath, buffer)
    }
    return buffer
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    console.error("[smartlink] renderSmartlinkOgCoverBuffer error:", error)
    return null
  }
}

export const SMARTLINK_COVER_CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800"
