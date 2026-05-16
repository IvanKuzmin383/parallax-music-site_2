import path from "path"
import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import {
  getUploadDraftById,
  getUploadDraftsDir,
  unlinkUploadDraftMediaFile,
  updateUploadDraft,
} from "@/lib/upload-drafts"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"

const MAX_AUDIO_SIZE = 80 * 1024 * 1024

type AlbumDraftTrackPayload = {
  tempId?: string
  audioRelPath?: string
  [key: string]: unknown
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id } = await params
  const draft = await getUploadDraftById(id)
  if (!draft || draft.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Черновик не найден" }, { status: 404 })
  }
  if (draft.kind !== "album") {
    return NextResponse.json({ error: "Для сингла используйте обычную загрузку аудио черновика" }, { status: 400 })
  }
  if (!["collecting", "awaiting_payment", "paid"].includes(draft.status)) {
    return NextResponse.json({ error: "Этот черновик больше нельзя редактировать" }, { status: 400 })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 1,
      maxFields: 4,
      maxFileSizeBytes: MAX_AUDIO_SIZE,
      maxFieldSizeBytes: 8 * 1024,
    })
    try {
      const tempId = `${multipart.getField("tempId") ?? ""}`.trim()
      const audio = multipart.getFile("audio")
      if (!tempId || !audio) {
        return NextResponse.json({ error: "Передайте tempId и WAV-файл" }, { status: 400 })
      }
      const ext = audio.originalFilename.toLowerCase().split(".").pop()
      if (ext !== "wav") return NextResponse.json({ error: "Аудио должно быть в формате WAV" }, { status: 400 })
      if (audio.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ error: "Размер аудиофайла не должен превышать 80 MB" }, { status: 400 })
      }
      const wavError = await validateWavFormatFromFilePath(audio.tempFilePath)
      if (wavError) return NextResponse.json({ error: wavError }, { status: 400 })

      const tracks = Array.isArray(draft.payload.albumTracks)
        ? (draft.payload.albumTracks as AlbumDraftTrackPayload[])
        : []
      const idx = tracks.findIndex((t) => `${t.tempId ?? ""}`.trim() === tempId)
      if (idx < 0) {
        return NextResponse.json({ error: "Трек черновика не найден" }, { status: 404 })
      }

      const newRelPath = `${crypto.randomUUID()}.wav`
      const draftsDir = await getUploadDraftsDir()
      await copyFileToPathAtomic(audio.tempFilePath, path.join(draftsDir, newRelPath))

      const prevRelPath = tracks[idx]?.audioRelPath
      if (typeof prevRelPath === "string" && prevRelPath.trim()) {
        await unlinkUploadDraftMediaFile(prevRelPath)
      }

      const nextTracks = tracks.map((track, trackIndex) =>
        trackIndex === idx ? { ...track, audioRelPath: newRelPath } : track
      )
      const updated = await updateUploadDraft(draft.id, {
        payload: {
          ...draft.payload,
          albumTracks: nextTracks,
        },
      })

      return NextResponse.json({
        ok: true,
        draft: updated,
        tempId,
        audioRelPath: newRelPath,
      })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error uploading album draft audio:", error)
    return NextResponse.json({ error: "Не удалось загрузить аудио трека черновика" }, { status: 500 })
  }
}
