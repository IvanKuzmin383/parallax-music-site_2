import { execFile } from "node:child_process"
import { promises as fs } from "node:fs"
import path from "node:path"
import { promisify } from "node:util"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"

const execFileAsync = promisify(execFile)

/** In-flight конвертации (ключ = абсолютный path кэша). */
const preparingByCachePath = new Map<
  string,
  Promise<{ ok: true } | { ok: false; error: string }>
>()

/** Последняя ошибка конвертации (чтобы HTTP-полл не крутился вечно). */
const lastFailureByCachePath = new Map<string, { error: string; at: number }>()
const FAILURE_TTL_MS = 60_000

/** Кэш WAV рядом с исходником: `0.mp3` -> `0.download.wav`. */
export function aiTracksDownloadWavPath(sourcePath: string): string {
  const dir = path.dirname(sourcePath)
  const base = path.basename(sourcePath, path.extname(sourcePath))
  return path.join(dir, `${base}.download.wav`)
}

async function wavFileLooksReady(wavPath: string): Promise<boolean> {
  try {
    const info = await fs.stat(wavPath)
    if (info.size <= 1024) return false
    const wavError = await validateWavFormatFromFilePath(wavPath)
    return !wavError
  } catch {
    return false
  }
}

export async function isAiTracksWavReady(sourcePath: string): Promise<boolean> {
  return wavFileLooksReady(aiTracksDownloadWavPath(sourcePath))
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
  const workKey = path.resolve(workPath)

  const existing = preparingByCachePath.get(workKey)
  if (existing) {
    const result = await existing
    if (!result.ok) return result
    if (path.resolve(workPath) !== path.resolve(params.destPath)) {
      await copyFileToPathAtomic(workPath, params.destPath)
    }
    return { ok: true }
  }

  const run = (async (): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      if (await wavFileLooksReady(workPath)) {
        lastFailureByCachePath.delete(workKey)
        if (path.resolve(workPath) !== path.resolve(params.destPath)) {
          await copyFileToPathAtomic(workPath, params.destPath)
        }
        return { ok: true }
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
          { timeout: 180_000, maxBuffer: 4 * 1024 * 1024 }
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
        const error =
          "Не удалось подготовить WAV (44.1 kHz). Попробуйте позже или обратитесь в поддержку."
        lastFailureByCachePath.set(workKey, { error, at: Date.now() })
        return { ok: false, error }
      }

      const wavError = await validateWavFormatFromFilePath(workPath)
      if (wavError) {
        await fs.unlink(workPath).catch(() => undefined)
        lastFailureByCachePath.set(workKey, { error: wavError, at: Date.now() })
        return { ok: false, error: wavError }
      }

      lastFailureByCachePath.delete(workKey)
      if (path.resolve(workPath) !== path.resolve(params.destPath)) {
        await copyFileToPathAtomic(workPath, params.destPath)
      }
      return { ok: true }
    } finally {
      preparingByCachePath.delete(workKey)
    }
  })()

  preparingByCachePath.set(workKey, run)
  return run
}

export function getAiTracksWavPrepareFailure(sourcePath: string): string | null {
  const key = path.resolve(aiTracksDownloadWavPath(sourcePath))
  const hit = lastFailureByCachePath.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > FAILURE_TTL_MS) {
    lastFailureByCachePath.delete(key)
    return null
  }
  return hit.error
}

/**
 * Запускает подготовку WAV без ожидания (дедуп по файлу).
 * Для HTTP: сначала отдать 202, клиент поллит готовность.
 */
export function startAiTracksWavPrepare(params: {
  sourcePath: string
  format: string | null
}): { started: boolean; recentError: string | null } {
  const destPath = aiTracksDownloadWavPath(params.sourcePath)
  const key = path.resolve(destPath)
  const recentError = getAiTracksWavPrepareFailure(params.sourcePath)
  if (recentError) return { started: false, recentError }
  if (preparingByCachePath.has(key)) return { started: true, recentError: null }
  void ensureAiTracksWavFile({
    sourcePath: params.sourcePath,
    format: params.format,
    destPath,
  }).catch((err) => {
    console.warn("[ai-tracks-wav] background prepare failed", err)
  })
  return { started: true, recentError: null }
}

export function isAiTracksWavPreparing(sourcePath: string): boolean {
  const key = path.resolve(aiTracksDownloadWavPath(sourcePath))
  return preparingByCachePath.has(key)
}
