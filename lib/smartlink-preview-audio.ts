import { execFile } from "node:child_process"
import { createReadStream, createWriteStream } from "node:fs"
import { access, mkdir, open, rename, stat, unlink } from "node:fs/promises"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import { promisify } from "node:util"
import { getUploadsBasePath } from "@/lib/tracks"
import {
  SMARTLINK_PREVIEW_AUDIO_DURATION_SEC,
  SMARTLINK_PREVIEW_AUDIO_START_MAX,
} from "@/lib/smartlink-theme"

const execFileAsync = promisify(execFile)

/** Параллельная генерация одного и того же файла - одна промиса. */
const inflight = new Map<string, Promise<SmartlinkPreviewFile>>()

export const SMARTLINK_PREVIEW_AUDIO_CACHE_CONTROL =
  "public, max-age=86400, stale-while-revalidate=604800"

export type SmartlinkPreviewFile = {
  path: string
  contentType: "audio/mpeg" | "audio/wav"
}

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

function cacheBase(trackId: string, startSec: number): string {
  return `${trackId}-s${clampStart(startSec)}-d${SMARTLINK_PREVIEW_AUDIO_DURATION_SEC}`
}

type WavLayout = {
  audioFormat: number
  numChannels: number
  sampleRate: number
  bitsPerSample: number
  dataOffset: number
  dataSize: number
  blockAlign: number
}

async function readWavLayout(filePath: string): Promise<WavLayout | null> {
  const fh = await open(filePath, "r")
  try {
    const header = Buffer.alloc(12)
    await fh.read(header, 0, 12, 0)
    if (header.toString("ascii", 0, 4) !== "RIFF" || header.toString("ascii", 8, 12) !== "WAVE") {
      return null
    }

    let offset = 12
    let fmt: Omit<WavLayout, "dataOffset" | "dataSize" | "blockAlign"> | null = null
    let dataOffset = -1
    let dataSize = 0
    const chunkHead = Buffer.alloc(8)

    // Читаем чанки пока не найдём data (лимит - первые 8MB метаданных)
    while (offset < 8 * 1024 * 1024) {
      const { bytesRead } = await fh.read(chunkHead, 0, 8, offset)
      if (bytesRead < 8) break
      const id = chunkHead.toString("ascii", 0, 4)
      const size = chunkHead.readUInt32LE(4)
      const bodyStart = offset + 8

      if (id === "fmt " && size >= 16) {
        const fmtBuf = Buffer.alloc(Math.min(size, 32))
        await fh.read(fmtBuf, 0, fmtBuf.length, bodyStart)
        fmt = {
          audioFormat: fmtBuf.readUInt16LE(0),
          numChannels: fmtBuf.readUInt16LE(2),
          sampleRate: fmtBuf.readUInt32LE(4),
          bitsPerSample: fmtBuf.readUInt16LE(14),
        }
      } else if (id === "data") {
        dataOffset = bodyStart
        dataSize = size
        break
      }

      offset = bodyStart + size + (size % 2)
    }

    if (!fmt || dataOffset < 0 || dataSize <= 0) return null
    if (fmt.audioFormat !== 1) return null // только PCM
    if (fmt.bitsPerSample !== 16 && fmt.bitsPerSample !== 24) return null
    const blockAlign = (fmt.numChannels * fmt.bitsPerSample) / 8
    if (!Number.isInteger(blockAlign) || blockAlign <= 0) return null

    return { ...fmt, dataOffset, dataSize, blockAlign }
  } finally {
    await fh.close()
  }
}

function buildWavHeader(params: {
  dataSize: number
  numChannels: number
  sampleRate: number
  bitsPerSample: number
}): Buffer {
  const { dataSize, numChannels, sampleRate, bitsPerSample } = params
  const blockAlign = (numChannels * bitsPerSample) / 8
  const byteRate = sampleRate * blockAlign
  const buf = Buffer.alloc(44)
  buf.write("RIFF", 0)
  buf.writeUInt32LE(36 + dataSize, 4)
  buf.write("WAVE", 8)
  buf.write("fmt ", 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(numChannels, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(byteRate, 28)
  buf.writeUInt16LE(blockAlign, 32)
  buf.writeUInt16LE(bitsPerSample, 34)
  buf.write("data", 36)
  buf.writeUInt32LE(dataSize, 40)
  return buf
}

/** Нарезка PCM WAV без ffmpeg - надёжный fallback. */
async function sliceWavPreview(params: {
  sourceWavPath: string
  destPath: string
  startSec: number
}): Promise<void> {
  const layout = await readWavLayout(params.sourceWavPath)
  if (!layout) throw new Error("unsupported wav for preview slice")

  const bytesPerSec = layout.sampleRate * layout.blockAlign
  const startByte =
    Math.floor((params.startSec * bytesPerSec) / layout.blockAlign) * layout.blockAlign
  const wantBytes =
    Math.floor((SMARTLINK_PREVIEW_AUDIO_DURATION_SEC * bytesPerSec) / layout.blockAlign) *
    layout.blockAlign
  const available = Math.max(0, layout.dataSize - startByte)
  const dataSize = Math.min(wantBytes, available)
  if (dataSize < layout.blockAlign * layout.sampleRate) {
    // меньше ~1 сек - слишком мало
    throw new Error("preview slice too short")
  }

  const absStart = layout.dataOffset + startByte
  const tmpPath = `${params.destPath}.${process.pid}.${Date.now()}.tmp.wav`
  const header = buildWavHeader({
    dataSize,
    numChannels: layout.numChannels,
    sampleRate: layout.sampleRate,
    bitsPerSample: layout.bitsPerSample,
  })
  const out = createWriteStream(tmpPath)
  const rs = createReadStream(params.sourceWavPath, {
    start: absStart,
    end: absStart + dataSize - 1,
  })
  try {
    await new Promise<void>((resolve, reject) => {
      out.write(header, (err) => (err ? reject(err) : resolve()))
    })
    await pipeline(rs, out)
    const info = await stat(tmpPath)
    if (info.size < 1024) throw new Error("preview wav too small")
    await rename(tmpPath, params.destPath)
  } catch (err) {
    await unlink(tmpPath).catch(() => undefined)
    throw err
  }
}

async function tryFfmpegMp3(params: {
  sourceWavPath: string
  destPath: string
  startSec: number
}): Promise<void> {
  const tmpPath = `${params.destPath}.${process.pid}.${Date.now()}.tmp.mp3`
  try {
    await execFileAsync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(params.startSec),
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
    if (info.size < 1024) throw new Error("preview mp3 too small")
    await rename(tmpPath, params.destPath)
  } catch (err) {
    await unlink(tmpPath).catch(() => undefined)
    throw err
  }
}

/**
 * Готовит короткий хук (mp3 через ffmpeg, иначе WAV-срез) и возвращает путь + content-type.
 */
export async function ensureSmartlinkPreviewAudio(params: {
  trackId: string
  sourceWavPath: string
  startSec: number
}): Promise<SmartlinkPreviewFile> {
  const startSec = clampStart(params.startSec)
  const base = cacheBase(params.trackId, startSec)
  const dir = await getPreviewDir()
  const mp3Path = path.join(dir, `${base}.mp3`)
  const wavPath = path.join(dir, `${base}.wav`)
  const lockKey = path.join(dir, base)

  try {
    const info = await stat(mp3Path)
    if (info.size > 1024) return { path: mp3Path, contentType: "audio/mpeg" }
  } catch {
    // continue
  }
  try {
    const info = await stat(wavPath)
    if (info.size > 1024) return { path: wavPath, contentType: "audio/wav" }
  } catch {
    // continue
  }

  const existing = inflight.get(lockKey)
  if (existing) return existing

  const job = (async (): Promise<SmartlinkPreviewFile> => {
    await access(params.sourceWavPath)
    try {
      await tryFfmpegMp3({
        sourceWavPath: params.sourceWavPath,
        destPath: mp3Path,
        startSec,
      })
      return { path: mp3Path, contentType: "audio/mpeg" }
    } catch (ffmpegErr) {
      console.warn("[smartlink-preview] ffmpeg mp3 failed, falling back to wav slice", ffmpegErr)
      await sliceWavPreview({
        sourceWavPath: params.sourceWavPath,
        destPath: wavPath,
        startSec,
      })
      return { path: wavPath, contentType: "audio/wav" }
    } finally {
      inflight.delete(lockKey)
    }
  })()

  inflight.set(lockKey, job)
  return job
}
