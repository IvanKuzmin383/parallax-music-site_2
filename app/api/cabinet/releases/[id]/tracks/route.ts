import path from "path"
import crypto from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"
import { createTrack, getAudioDir, getTracksByReleaseId } from "@/lib/tracks"
import { GENRES } from "@/lib/track-constants"
import { getReleaseById } from "@/lib/releases"

const MAX_AUDIO_SIZE = 80 * 1024 * 1024

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })

  const { id: releaseId } = await params
  const release = await getReleaseById(releaseId)
  if (!release || release.userId.toLowerCase() !== session.email.toLowerCase()) {
    return NextResponse.json({ error: "Релиз не найден" }, { status: 404 })
  }

  if (!["draft", "awaiting_payment"].includes(release.status)) {
    return NextResponse.json({ error: "Релиз нельзя редактировать" }, { status: 400 })
  }

  const existingTracks = await getTracksByReleaseId(releaseId)
  if (release.kind === "single" && existingTracks.length >= 1) {
    return NextResponse.json({ error: "Сингл может содержать только один трек" }, { status: 400 })
  }

  try {
    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 1,
      maxFields: 5,
      maxFileSizeBytes: MAX_AUDIO_SIZE,
      maxFieldSizeBytes: 16 * 1024,
    })

    try {
      const audio = multipart.getFile("audio")
      if (!audio || audio.size === 0) {
        return NextResponse.json({ error: "Аудиофайл обязателен" }, { status: 400 })
      }
      if (audio.size > MAX_AUDIO_SIZE) {
        return NextResponse.json({ error: "Размер аудиофайла не должен превышать 80 MB" }, { status: 400 })
      }

      const wavError = await validateWavFormatFromFilePath(audio.tempFilePath)
      if (wavError) return NextResponse.json({ error: wavError }, { status: 400 })

      const trackId = crypto.randomUUID()
      const audioDir = await getAudioDir()
      const audioPath = path.join(audioDir, `${trackId}.wav`)
      await copyFileToPathAtomic(audio.tempFilePath, audioPath)

      const baseName = audio.originalFilename.replace(/\.[^.]+$/, "").trim()
      const trackName = multipart.getField("trackName")?.trim() || baseName || `Трек ${existingTracks.length + 1}`

      const track = await createTrack({
        userId: session.email,
        releaseId,
        trackOrder: existingTracks.length,
        trackName,
        artistName: release.artistName || "—",
        labelName: release.labelName,
        genre: GENRES[0],
        mood: "",
        shortDescription: "",
        lyricsText: "",
        musicAuthor: "",
        lyricsAuthor: "",
        musicRights: "",
        musicAiService: "",
        lyricsRights: "",
        performanceRights: "",
        isInstrumental: false,
        backingAuthor: "",
        coverPath: release.coverPath,
        audioPath,
        status: "draft",
        releaseDate: release.releaseDate,
      })

      const tracks = await getTracksByReleaseId(releaseId)
      return NextResponse.json({ track, tracks }, { status: 201 })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("[releases/tracks POST]", error)
    return NextResponse.json({ error: "Не удалось загрузить аудио" }, { status: 500 })
  }
}
