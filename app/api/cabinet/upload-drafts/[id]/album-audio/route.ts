import path from "path"
import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import {
  getUploadDraftById,
  getUploadDraftsDir,
  unlinkUploadDraftMediaFile,
  updateUploadDraft,
  type UploadDraft,
} from "@/lib/upload-drafts"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import { claimDraftAudioRelPath } from "@/lib/cabinet-chunk-uploads"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"
import { MAX_CABINET_WAV_BYTES, cabinetWavMaxSizeError } from "@/lib/cabinet-wav-upload-limits"

const MAX_AUDIO_SIZE = MAX_CABINET_WAV_BYTES

type AlbumDraftTrackPayload = {
  tempId?: string
  audioRelPath?: string
  [key: string]: unknown
}

async function attachAlbumTrackAudio(params: {
  draft: UploadDraft
  tempId: string
  newRelPath: string
}): Promise<
  | { error: NextResponse; json?: undefined }
  | {
      error?: undefined
      json: { ok: true; draft: UploadDraft | null; tempId: string; audioRelPath: string }
    }
> {
  const tracks = Array.isArray(params.draft.payload.albumTracks)
    ? (params.draft.payload.albumTracks as AlbumDraftTrackPayload[])
    : []
  const idx = tracks.findIndex((t) => `${t.tempId ?? ""}`.trim() === params.tempId)
  if (idx < 0) {
    return { error: NextResponse.json({ error: "Трек черновика не найден" }, { status: 404 }) }
  }

  const prevRelPath = tracks[idx]?.audioRelPath
  if (typeof prevRelPath === "string" && prevRelPath.trim() && prevRelPath !== params.newRelPath) {
    await unlinkUploadDraftMediaFile(prevRelPath)
  }

  const nextTracks = tracks.map((track, trackIndex) =>
    trackIndex === idx ? { ...track, audioRelPath: params.newRelPath } : track
  )
  const updated = await updateUploadDraft(params.draft.id, {
    payload: {
      ...params.draft.payload,
      albumTracks: nextTracks,
    },
  })

  return {
    json: {
      ok: true as const,
      draft: updated,
      tempId: params.tempId,
      audioRelPath: params.newRelPath,
    },
  }
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

  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    let body: { tempId?: unknown; audioRelPath?: unknown }
    try {
      body = (await request.json()) as { tempId?: unknown; audioRelPath?: unknown }
    } catch {
      return NextResponse.json({ error: "Неверный JSON" }, { status: 400 })
    }
    const tempId = typeof body.tempId === "string" ? body.tempId.trim() : ""
    const audioRelPath = typeof body.audioRelPath === "string" ? body.audioRelPath.trim() : ""
    if (!tempId || !audioRelPath) {
      return NextResponse.json({ error: "Передайте tempId и audioRelPath" }, { status: 400 })
    }
    const claimed = await claimDraftAudioRelPath(session.email, audioRelPath)
    if (!claimed.ok) {
      return NextResponse.json({ error: claimed.error }, { status: claimed.status })
    }
    const attached = await attachAlbumTrackAudio({ draft, tempId, newRelPath: claimed.relPath })
    if (attached.error) return attached.error
    return NextResponse.json(attached.json)
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
      const claimedRaw = `${multipart.getField("audioRelPath") ?? ""}`.trim()
      const audio = multipart.getFile("audio")
      if (!tempId) {
        return NextResponse.json({ error: "Передайте tempId" }, { status: 400 })
      }

      if (claimedRaw) {
        const claimed = await claimDraftAudioRelPath(session.email, claimedRaw)
        if (!claimed.ok) {
          return NextResponse.json({ error: claimed.error }, { status: claimed.status })
        }
        const attached = await attachAlbumTrackAudio({ draft, tempId, newRelPath: claimed.relPath })
        if (attached.error) return attached.error
        return NextResponse.json(attached.json)
      }

      if (!audio) {
        return NextResponse.json({ error: "Передайте tempId и WAV-файл" }, { status: 400 })
      }
      const ext = audio.originalFilename.toLowerCase().split(".").pop()
      if (ext !== "wav") return NextResponse.json({ error: "Аудио должно быть в формате WAV" }, { status: 400 })
      if (audio.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ error: cabinetWavMaxSizeError() }, { status: 400 })
      }
      const wavError = await validateWavFormatFromFilePath(audio.tempFilePath)
      if (wavError) return NextResponse.json({ error: wavError }, { status: 400 })

      const newRelPath = `${crypto.randomUUID()}.wav`
      const draftsDir = await getUploadDraftsDir()
      await copyFileToPathAtomic(audio.tempFilePath, path.join(draftsDir, newRelPath))

      const attached = await attachAlbumTrackAudio({ draft, tempId, newRelPath })
      if (attached.error) return attached.error
      return NextResponse.json(attached.json)
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
