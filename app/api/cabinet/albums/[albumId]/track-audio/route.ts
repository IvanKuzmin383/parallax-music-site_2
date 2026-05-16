import { NextRequest, NextResponse } from "next/server"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkProfileCompleteForUpload } from "@/lib/cabinet-upload-profile-gate"
import { getTrackById } from "@/lib/tracks"
import { getAlbumById } from "@/lib/albums"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"

const MAX_AUDIO_SIZE = 80 * 1024 * 1024 // 80 MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> }
) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  const { albumId } = await params

  try {
    const user = await getCabinetUserByEmail(session.email)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isFixPlan = user?.subscriptionName === "Fix"
    const hasActiveSubscription =
      isFixPlan ||
      (user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) >= today)
    if (!hasActiveSubscription || !user) {
      return NextResponse.json(
        {
          error:
            "Для загрузки треков необходима активная подписка. Обратитесь к администратору для подключения тарифа.",
        },
        { status: 403 }
      )
    }

    const profileGate = checkProfileCompleteForUpload(user)
    if (profileGate) {
      return NextResponse.json(profileGate.body, { status: profileGate.status })
    }

    const album = await getAlbumById(albumId)
    if (!album || album.userId.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Альбом не найден" }, { status: 404 })
    }

    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 1,
      maxFields: 4,
      maxFileSizeBytes: MAX_AUDIO_SIZE,
      maxFieldSizeBytes: 8 * 1024,
    })
    try {
      const trackId = multipart.getField("trackId")?.trim()
      const audioFile = multipart.getFile("audio")

      if (!trackId || !audioFile) {
        return NextResponse.json(
          { error: "Укажите trackId и аудиофайл (WAV)" },
          { status: 400 }
        )
      }

    const track = await getTrackById(trackId)
    if (!track || track.userId.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: "Трек не найден" }, { status: 404 })
    }
    if (track.albumId !== albumId) {
      return NextResponse.json({ error: "Трек не относится к этому альбому" }, { status: 400 })
    }

      const audioExt = audioFile.originalFilename.toLowerCase().split(".").pop()
    if (audioExt !== "wav") {
      return NextResponse.json(
        { error: `Аудио для трека "${track.trackName}" должно быть в формате WAV` },
        { status: 400 }
      )
    }
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        {
          error: `Размер аудиофайла для трека "${track.trackName}" не должен превышать 80 MB`,
        },
        { status: 400 }
      )
    }

      const wavError = await validateWavFormatFromFilePath(audioFile.tempFilePath)
    if (wavError) {
      return NextResponse.json({ error: `${track.trackName}: ${wavError}` }, { status: 400 })
    }

      await copyFileToPathAtomic(audioFile.tempFilePath, track.audioPath)

      return NextResponse.json({ ok: true, trackId: track.id })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error uploading album track audio:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить аудио трека" },
      { status: 500 }
    )
  }
}
