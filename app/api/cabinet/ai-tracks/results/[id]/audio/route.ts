import { NextRequest, NextResponse } from "next/server"
import { promises as fs } from "fs"
import path from "path"
import { getCabinetSession, getCabinetToken } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getAiTracksResultAudioForUser } from "@/lib/ai-tracks-jobs"
import {
  aiTracksDownloadWavPath,
  ensureAiTracksWavFile,
  isAiTracksWavPreparing,
  isAiTracksWavReady,
  startAiTracksWavPrepare,
  takeAiTracksWavPrepareError,
} from "@/lib/ai-tracks-wav"
import { getUploadsBasePath } from "@/lib/tracks"
import { createFileRangeResponse } from "@/lib/node-file-range-response"

export const runtime = "nodejs"
export const maxDuration = 300

function safeJoinUploads(base: string, storageKey: string): string | null {
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "")
  if (!normalized.startsWith("ai-tracks/") || normalized.includes("..")) return null
  const full = path.join(base, normalized)
  const resolved = path.resolve(full)
  const baseResolved = path.resolve(base)
  if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) return null
  return resolved
}

function safeDownloadBasename(title: string): string {
  const cleaned = title
    .replace(/[^\p{L}\p{N}\s._-]+/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
  return cleaned || "track"
}

function attachmentDisposition(basename: string, ext: string): string {
  const ascii =
    basename
      .normalize("NFKD")
      .replace(/[^\x20-\x7E]+/g, "_")
      .replace(/["\\]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 80) || "track"
  const utf8Name = encodeURIComponent(`${basename}.${ext}`)
  return `attachment; filename="${ascii}.${ext}"; filename*=UTF-8''${utf8Name}`
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const user = await getCabinetUserByEmail(session.email)
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 })
  }

  const { id } = await context.params
  const meta = await getAiTracksResultAudioForUser({ userId: user.id, resultId: id })
  if (!meta) {
    return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
  }

  const base = await getUploadsBasePath()
  const filePath = safeJoinUploads(base, meta.storageKey)
  if (!filePath) {
    return NextResponse.json({ error: "Некорректный путь файла" }, { status: 400 })
  }

  const wantsDownload =
    request.nextUrl.searchParams.get("download") === "1" ||
    request.nextUrl.searchParams.get("format") === "wav"
  /** Старый режим: ждать ffmpeg в этом же запросе (внутренние/ретраи). */
  const waitForWav = request.nextUrl.searchParams.get("wait") === "1"

  try {
    await fs.access(filePath)
  } catch {
    return NextResponse.json({ error: "Файл недоступен" }, { status: 404 })
  }

  try {
    if (wantsDownload) {
      const wavPath = aiTracksDownloadWavPath(filePath)
      const ready = await isAiTracksWavReady(filePath)

      if (!ready && !waitForWav) {
        const prep = startAiTracksWavPrepare({
          sourcePath: filePath,
          format: meta.format,
        })
        if (prep.recentError) {
          return NextResponse.json({ error: prep.recentError }, { status: 503 })
        }
        return NextResponse.json(
          {
            status: "preparing",
            preparing: true,
            inFlight: isAiTracksWavPreparing(filePath),
            message: "Готовим WAV (44.1 kHz). Повторите запрос через пару секунд.",
          },
          { status: 202 }
        )
      }

      const prepared = await ensureAiTracksWavFile({
        sourcePath: filePath,
        format: meta.format,
        destPath: wavPath,
      })
      if (!prepared.ok) {
        return NextResponse.json({ error: prepared.error }, { status: 503 })
      }
      const info = await fs.stat(wavPath)
      const basename = safeDownloadBasename(meta.title)
      return createFileRangeResponse({
        contentType: "audio/wav",
        fileSize: info.size,
        absPath: wavPath,
        rangeHeader: request.headers.get("range"),
        contentDisposition: attachmentDisposition(basename, "wav"),
      })
    }

    const info = await fs.stat(filePath)
    const contentType =
      meta.format === "wav"
        ? "audio/wav"
        : meta.format === "flac"
          ? "audio/flac"
          : "audio/mpeg"
    const ext = meta.format === "wav" ? "wav" : meta.format === "flac" ? "flac" : "mp3"
    const basename = safeDownloadBasename(meta.title)

    return createFileRangeResponse({
      contentType,
      fileSize: info.size,
      absPath: filePath,
      rangeHeader: request.headers.get("range"),
      contentDisposition: `inline; filename="${basename.replace(/[^\x20-\x7E]/g, "_") || "track"}.${ext}"`,
    })
  } catch (err) {
    console.error("[ai-tracks/audio]", err)
    return NextResponse.json({ error: "Файл недоступен" }, { status: 404 })
  }
}
