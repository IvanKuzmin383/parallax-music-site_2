import path from "path"
import crypto from "crypto"
import { stat } from "node:fs/promises"
import { NextRequest, NextResponse } from "next/server"
import { getAdminToken, verifySession } from "@/lib/auth"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import { createFileRangeResponse } from "@/lib/node-file-range-response"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"
import {
  getUploadDraftById,
  getUploadDraftsDir,
  unlinkUploadDraftMediaFile,
  updateUploadDraft,
  type UploadDraftStatus,
} from "@/lib/upload-drafts"
import { MAX_CABINET_WAV_BYTES, cabinetWavMaxSizeError } from "@/lib/cabinet-wav-upload-limits"

const MAX_AUDIO_SIZE = MAX_CABINET_WAV_BYTES

function adminCanEditDraftMedia(status: UploadDraftStatus): boolean {
  return status === "collecting" || status === "awaiting_payment" || status === "paid"
}

function sanitizeFileNamePart(input: string): string {
  const cleaned = input
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  return cleaned || "Без названия"
}

function buildDownloadFileName(draft: Awaited<ReturnType<typeof getUploadDraftById>>): string {
  const payload = (draft?.payload ?? {}) as Record<string, unknown>
  const artistName = sanitizeFileNamePart(String(payload.artistName ?? payload.albumArtistName ?? "Неизвестный артист"))
  const trackName = sanitizeFileNamePart(String(payload.trackName ?? payload.albumTitle ?? "Без названия трека"))
  return `${artistName} - ${trackName}.wav`
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(req)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }

  if (!draft.audioRelPath) {
    return NextResponse.json({ error: "В черновике нет аудио" }, { status: 404 })
  }

  const safeName = path.basename(draft.audioRelPath)
  if (safeName !== draft.audioRelPath || !safeName.endsWith(".wav")) {
    return NextResponse.json({ error: "Некорректный путь к файлу" }, { status: 400 })
  }

  const draftsDir = await getUploadDraftsDir()
  const absPath = path.join(draftsDir, safeName)

  try {
    const info = await stat(absPath)
    const disposition =
      req.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline"
    return createFileRangeResponse({
      absPath,
      fileSize: info.size,
      contentType: "audio/wav",
      rangeHeader: req.headers.get("range"),
      contentDisposition: `${disposition}; filename*=UTF-8''${encodeURIComponent(buildDownloadFileName(draft))}`,
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ error: "Файл не найден" }, { status: 404 })
    }
    console.error("admin upload draft audio read:", err)
    return NextResponse.json({ error: "Не удалось отдать аудио" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getAdminToken(request)
  if (!verifySession(token)) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }
  if (!adminCanEditDraftMedia(draft.status)) {
    return NextResponse.json({ error: "Этот черновик больше нельзя редактировать" }, { status: 400 })
  }
  if (draft.kind !== "single") {
    return NextResponse.json(
      { error: "Для альбома загружайте WAV по каждому треку в кабинете пользователя" },
      { status: 400 }
    )
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 1,
      maxFields: 4,
      maxFileSizeBytes: MAX_AUDIO_SIZE,
      maxFieldSizeBytes: 4 * 1024,
    })
    try {
      const audio = multipart.getFile("audio")
      if (!audio || audio.size === 0) {
        return NextResponse.json({ error: "Выберите WAV-файл" }, { status: 400 })
      }
      if (audio.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ error: cabinetWavMaxSizeError() }, { status: 400 })
      }
      const wavError = await validateWavFormatFromFilePath(audio.tempFilePath)
      if (wavError) return NextResponse.json({ error: wavError }, { status: 400 })

      const newRel = `${crypto.randomUUID()}.wav`
      const draftsDir = await getUploadDraftsDir()
      await copyFileToPathAtomic(audio.tempFilePath, path.join(draftsDir, newRel))
      if (draft.audioRelPath) await unlinkUploadDraftMediaFile(draft.audioRelPath)

      const updated = await updateUploadDraft(id, { audioRelPath: newRel })
      return NextResponse.json({ draft: updated })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("admin upload draft audio write:", error)
    return NextResponse.json({ error: "Не удалось загрузить аудио" }, { status: 500 })
  }
}
