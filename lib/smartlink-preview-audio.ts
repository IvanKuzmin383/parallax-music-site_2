import { execFile } from "node:child_process"
import { access, mkdir, rename, stat, unlink } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { getUploadsBasePath } from "@/lib/tracks"
import {
  SMARTLINK_PREVIEW_AUDIO_DURATION_SEC,
  SMARTLINK_PREVIEW_AUDIO_START_MAX,
} from "@/lib/smartlink-theme"

const execFileAsync = promisify(execFile)

/** Параллельная генерация одного и того же файла - одна промиса. */
const inflight = new Map<string, Promise<string>>()

export const SMARTLINK_PREVIEW_AUDIO_CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800"

function clampStart(sec: number): number {
  if (!Number.isFinite(sec)) return 0
  return Math.min(SMARTLINK_PREVIEW_AUDIO_START_MAX, Math.max(0, Math.trunc(sec)))
}

async function getPreviewDir(): Promise<string> {
  const base = await getUploadsBasePath()
  const dir = path.join(base, "smartlink-previews")
  await mkdir(dir, { recursive: true })
  return dir
}

export function smartlinkPreviewCacheKey(trackId: string, startSec: number): string {
  return `${trackId}-s${clampStart(startSec)}-d${SMARTLINK_PREVIEW_AUDIO_DURATION_SEC}.mp3`
}

/**
 * Готовит короткий mp3-хук (не полный WAV) и возвращает путь к кэшу.
 * ffmpeg: -ss start -t duration -b:a 128k
 */
export async function ensureSmartlinkPreviewMp3(params: {
  trackId: string
  sourceWavPath: string
  startSec: number
}): Promise<string> {
  const startSec = clampStart(params.startSec)
  const fileName = smartlinkPreviewCacheKey(params.trackId, startSec)
  const dir = await getPreviewDir()
  const destPath = path.join(dir, fileName)

  try {
    const info = await stat(destPath)
    if (info.size > 1024) return destPath
  } catch {
    // regenerate
  }

  const existing = inflight.get(destPath)
  if (existing) return existing

  const job = (async () => {
    await access(params.sourceWavPath)
    const tmpPath = `${destPath}.${process.pid}.${Date.now()}.tmp.mp3`
    try {
      await execFileAsync(
        "ffmpeg",
        [
          "-y",
          "-ss",
          String(startSec),
          "-t",
          String(SMARTLINK_PREVIEW_AUDIO_DURATION_SEC),
          "-i",
          params.sourceWavPath,
          "-vn",
          "-acodec",
          "libmp3lame",
          "-b:a",
          "128k",
          "-ac",
          "2",
          "-ar",
          "44100",
          tmpPath,
        ],
        { timeout: 90_000, maxBuffer: 2 * 1024 * 1024 },
      )
      const info = await stat(tmpPath)
      if (info.size < 1024) {
        throw new Error("preview mp3 too small")
      }
      await rename(tmpPath, destPath)
      return destPath
    } catch (err) {
      await unlink(tmpPath).catch(() => undefined)
      throw err
    } finally {
      inflight.delete(destPath)
    }
  })()

  inflight.set(destPath, job)
  return job
}
