import { NextRequest, NextResponse } from "next/server"
import path from "node:path"
import { promises as fs } from "node:fs"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getTrackById } from "@/lib/tracks"
import {
  createUploadDraft,
  deleteUploadDraft,
  getUploadDraftsDir,
  type UploadDraftPayload,
  updateUploadDraft,
} from "@/lib/upload-drafts"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ trackId: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const { trackId } = await params
    const track = await getTrackById(trackId)
    if (!track || track.userId.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
    }
    if (track.status !== "upload_pending") {
      return NextResponse.json({ error: "Редактирование доступно только для статуса «Черновик»" }, { status: 400 })
    }

    const payload: UploadDraftPayload = {
      sourceTrackId: track.id,
      trackName: track.trackName,
      artistName: track.artistName,
      genre: track.genre,
      mood: track.mood,
      shortDescription: track.shortDescription,
      lyricsText: track.lyricsText,
      lyricsAuthor: track.lyricsAuthor,
      musicAuthor: track.musicAuthor,
      musicRights: track.musicRights,
      musicAiService: track.musicAiService,
      lyricsRights: track.lyricsRights,
      performanceRights: track.performanceRights,
      isInstrumental: track.isInstrumental,
      backingAuthor: track.backingAuthor,
      requestAiCover: Boolean(track.needsAiCover),
      releaseDate: track.releaseDate,
      addons: {},
    }

    const draft = await createUploadDraft({
      userId: session.email,
      kind: "single",
      status: "collecting",
      payload,
    })

    try {
      const draftsDir = await getUploadDraftsDir()
      const audioRelPath = `${draft.id}.wav`
      await fs.copyFile(track.audioPath, path.join(draftsDir, audioRelPath))

      let coverRelPath: string | undefined
      if (!track.needsAiCover && track.coverPath?.trim()) {
        const ext = path.extname(track.coverPath).replace(".", "").toLowerCase() || "jpg"
        coverRelPath = `${draft.id}.${ext}`
        await fs.copyFile(track.coverPath, path.join(draftsDir, coverRelPath))
      }

      const updated = await updateUploadDraft(draft.id, {
        audioRelPath,
        coverRelPath: coverRelPath ?? null,
      })
      const draftId = updated?.id ?? draft.id
      return NextResponse.json({
        draft: updated ?? draft,
        continueHref: `/cabinet/upload?draftId=${encodeURIComponent(draftId)}`,
      })
    } catch (copyError) {
      await deleteUploadDraft(draft.id)
      console.error("track edit draft create/copy failed:", copyError)
      return NextResponse.json({ error: "Не удалось подготовить черновик для редактирования" }, { status: 500 })
    }
  } catch (error) {
    console.error("track edit draft error:", error)
    return NextResponse.json({ error: "Не удалось подготовить черновик для редактирования" }, { status: 500 })
  }
}
