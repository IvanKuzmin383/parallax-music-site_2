import { execFile } from "node:child_process"
import { promises as fs } from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"

const execFileAsync = promisify(execFile)

/** Кэш WAV рядом с исходником: `0.mp3` -> `0.download.wav`. */
export function aiTracksDownloadWavPath(sourcePath: string): string {
  const dir = path.dirname(sourcePath)
  const base = path.basename(sourcePath, path.extname(sourcePath))
  return path.join(dir, `${base}.download.wav`)
}

/**
 * Готовит PCM WAV 44.1 kHz stereo для скачивания / дистрибуции.
 * Если исходник уже wav - копирует; иначе ffmpeg + кэш `.download.wav` рядом с исходником,
 * затем при необходимости копирует в `destPath`.
 */
export async function ensureAiTracksWavFile(params: {
  sourcePath: string
  format: string | null
  destPath: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const format = (params.format || "").toLowerCase()
  if (format === "wav" || path.extname(params.sourcePath).toLowerCase() === ".wav") {
    await copyFileToPathAtomic(params.sourcePath, params.destPath)
    const wavError = await validateWavFormatFromFilePath(params.destPath)
    if (wavError) return { ok: false, error: wavError }
    return { ok: true }
  }

  const cachePath = aiTracksDownloadWavPath(params.sourcePath)
  const workPath =
    path.resolve(params.destPath) === path.resolve(cachePath) ? params.destPath : cachePath

  try {
    const cached = await fs.stat(workPath)
    if (cached.size > 1024) {
      const wavError = await validateWavFormatFromFilePath(workPath)
      if (!wavError) {
        if (path.resolve(workPath) !== path.resolve(params.destPath)) {
          await copyFileToPathAtomic(workPath, params.destPath)
        }
        return { ok: true }
      }
      await fs.unlink(workPath).catch(() => undefined)
    }
  } catch {
    // no cache
  }

  const tmpPath = `${workPath}.${process.pid}.${Date.now()}.tmp.wav`
  try {
    await fs.mkdir(path.dirname(workPath), { recursive: true })
    const { stderr } = await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-i",
        params.sourcePath,
        "-acodec",
        "pcm_s16le",
        "-ar",
        "44100",
        "-ac",
        "2",
        tmpPath,
      ],
      { timeout: 180_000, maxBuffer: 4 * 1024 * 1024 },
    )
    const info = await fs.stat(tmpPath)
    if (info.size < 1024) throw new Error("wav too small")
    await fs.rename(tmpPath, workPath).catch(async () => {
      await fs.copyFile(tmpPath, workPath)
      await fs.unlink(tmpPath).catch(() => undefined)
    })
    if (stderr?.trim()) {
      console.warn("[ai-tracks-wav] ffmpeg stderr:", stderr.slice(0, 500))
    }
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => undefined)
    const detail = err instanceof Error ? err.message : String(err)
    console.error("[ai-tracks-wav] ffmpeg failed:", detail, {
      sourcePath: params.sourcePath,
      workPath,
    })
    return {
      ok: false,
      error: "Не удалось подготовить WAV (44.1 kHz). Попробуйте позже или обратитесь в поддержку.",
    }
  }

  const wavError = await validateWavFormatFromFilePath(workPath)
  if (wavError) {
    await fs.unlink(workPath).catch(() => undefined)
    return { ok: false, error: wavError }
  }

  if (path.resolve(workPath) !== path.resolve(params.destPath)) {
    await copyFileToPathAtomic(workPath, params.destPath)
  }
  return { ok: true }
}
