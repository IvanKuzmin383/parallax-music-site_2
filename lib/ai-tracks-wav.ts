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
 * Если исходник уже wav - копирует; иначе ffmpeg + кэш `.download.wav`.
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

  try {
    const cached = await fs.stat(params.destPath)
    if (cached.size > 1024) {
      const wavError = await validateWavFormatFromFilePath(params.destPath)
      if (!wavError) return { ok: true }
      await fs.unlink(params.destPath).catch(() => undefined)
    }
  } catch {
    // no cache
  }

  const tmpPath = `${params.destPath}.${process.pid}.${Date.now()}.tmp.wav`
  try {
    await execFileAsync(
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
    await fs.rename(tmpPath, params.destPath).catch(async () => {
      await fs.copyFile(tmpPath, params.destPath)
      await fs.unlink(tmpPath).catch(() => undefined)
    })
  } catch {
    await fs.unlink(tmpPath).catch(() => undefined)
    return {
      ok: false,
      error: "Не удалось подготовить WAV (44.1 kHz). Попробуйте позже или обратитесь в поддержку.",
    }
  }

  const wavError = await validateWavFormatFromFilePath(params.destPath)
  if (wavError) {
    await fs.unlink(params.destPath).catch(() => undefined)
    return { ok: false, error: wavError }
  }
  return { ok: true }
}
