import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import path from "node:path"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkProfileCompleteForUpload } from "@/lib/cabinet-upload-profile-gate"
import { getEffectiveTrackLimit } from "@/lib/subscription-plans"
import { getUploadArtistPolicyViolationWithSlots } from "@/lib/cabinet-upload-artist-policy"
import { createTrack, getAudioDir, getCoversDir, GENRES, TRACK_MOODS, getTracksByUserId } from "@/lib/tracks"
import { musicRightsRequiresAiService } from "@/lib/track-constants"
import { createAlbum, getAlbumsByUserId } from "@/lib/albums"
import { getDb } from "@/lib/db"
import { getClientIp, getUserAgent, tryRecordLicenseAcceptanceForTrack } from "@/lib/legal-acceptance"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import { isYyyyMmDdReleaseWeekend } from "@/lib/release-date-validation"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { getEffectiveReleaseLabelName } from "@/lib/release-label"
import { validateCabinetCoverImageFromFilePath } from "@/lib/cabinet-cover-validation"

const MAX_AUDIO_SIZE = 80 * 1024 * 1024 // 80 MB
const MAX_COVER_SIZE = 20 * 1024 * 1024 // 20 MB

type AlbumTrackMeta = {
  tempId: string
  trackName: string
  genre: string
  mood?: string
  shortDescription?: string
  lyricsText?: string
  lyricsAuthor?: string
  musicAuthor?: string
  musicRights?: string
  musicAiService?: string
  lyricsRights?: string
  performanceRights?: string
  isInstrumental?: boolean
  backingAuthor?: string
}

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const albums = await getAlbumsByUserId(session.email)
    return NextResponse.json({ albums })
  } catch (error) {
    console.error("Error fetching cabinet albums:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить альбомы" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const user = await getCabinetUserByEmail(session.email)
    if (!user) {
      return NextResponse.json(
        {
          error:
            "Для загрузки треков необходима активная подписка. Обратитесь к администратору для подключения тарифа.",
        },
        { status: 403 }
      )
    }
    const limit = getEffectiveTrackLimit(user)
    if (limit === 0) {
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

    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 64,
      maxFields: 200,
      maxFileSizeBytes: MAX_AUDIO_SIZE,
      maxFieldSizeBytes: 256 * 1024,
    })
    try {
      const consentOfferLicense = multipart.getField("consentOfferLicense")
      if (consentOfferLicense !== "true") {
        return NextResponse.json(
          {
            error:
              "Необходимо подтвердить согласие и ознакомление с публичной офертой и лицензионными условиями",
          },
          { status: 400 }
        )
      }

      const albumTitle = multipart.getField("albumTitle")?.trim()
      const albumArtistName = multipart.getField("albumArtistName")?.trim()
      const labelNameRaw = multipart.getField("labelName")
      const releaseDateStr = multipart.getField("releaseDate")
      const coverFile = multipart.getFile("cover")
      const tracksMetaRaw = multipart.getField("tracksMeta")

      if (!albumTitle || !albumArtistName || !coverFile || !releaseDateStr || !tracksMetaRaw) {
        return NextResponse.json(
          {
            error:
              "Обязательные поля: название альбома, исполнитель, дата публикации, обложка, треки",
          },
          { status: 400 }
        )
      }

    let tracksMeta: AlbumTrackMeta[]
    try {
      tracksMeta = JSON.parse(tracksMetaRaw) as AlbumTrackMeta[]
    } catch {
      return NextResponse.json(
        { error: "Некорректный формат данных треков альбома" },
        { status: 400 }
      )
    }

    if (!Array.isArray(tracksMeta) || tracksMeta.length === 0) {
      return NextResponse.json(
        { error: "Необходимо указать как минимум один трек в альбоме" },
        { status: 400 }
      )
    }

    const existingTracks = await getTracksByUserId(session.email)
    if (limit !== null && existingTracks.length + tracksMeta.length > limit) {
      return NextResponse.json(
        {
          error: `Текущий тариф предусматривает не более ${limit} активных релизов. Чтобы загрузить больше, необходимо расширить подписку или оплатить дополнительные треки.`,
        },
        { status: 403 }
      )
    }

    const albumArtistPolicyError = await getUploadArtistPolicyViolationWithSlots(user, albumArtistName)
    if (albumArtistPolicyError) {
      return NextResponse.json({ error: albumArtistPolicyError }, { status: 400 })
    }

    const labelName = getEffectiveReleaseLabelName(labelNameRaw, user.subscriptionName)

    let releaseDate: string | undefined
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(releaseDateStr)) {
        releaseDate = releaseDateStr
      } else {
        const date = new Date(releaseDateStr)
        if (isNaN(date.getTime())) {
          return NextResponse.json(
            { error: "Неверный формат даты публикации" },
            { status: 400 }
          )
        }
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, "0")
        const day = String(date.getDate()).padStart(2, "0")
        releaseDate = `${year}-${month}-${day}`
      }
    } catch {
      return NextResponse.json(
        { error: "Неверный формат даты публикации" },
        { status: 400 }
      )
    }

    if (releaseDate && isYyyyMmDdReleaseWeekend(releaseDate)) {
      return NextResponse.json(
        {
          error:
            "Дата публикации не может приходиться на выходной день (суббота или воскресенье)",
        },
        { status: 400 }
      )
    }

      const coverExt = coverFile.originalFilename.toLowerCase().split(".").pop()
    if (!["jpg", "jpeg", "png"].includes(coverExt ?? "")) {
      return NextResponse.json(
        { error: "Обложка должна быть в формате JPEG или PNG" },
        { status: 400 }
      )
    }

      if (coverFile.size > MAX_COVER_SIZE) {
      return NextResponse.json(
        { error: "Размер обложки не должен превышать 20 MB" },
        { status: 400 }
      )
    }

    for (const meta of tracksMeta) {
      if (!meta.trackName || !meta.genre) {
        return NextResponse.json(
          { error: "Для каждого трека необходимо указать название и жанр" },
          { status: 400 }
        )
      }
      if (!TRACK_MOODS.includes((meta.mood ?? "") as (typeof TRACK_MOODS)[number])) {
        return NextResponse.json(
          { error: `Для трека "${meta.trackName}" необходимо выбрать "Настроение трека"` },
          { status: 400 }
        )
      }
      if ((meta.shortDescription ?? "").trim().length < 2) {
        return NextResponse.json(
          { error: `Для трека "${meta.trackName}" необходимо заполнить "Краткое описание трека"` },
          { status: 400 }
        )
      }
      const musicRightsAllowed = [
        "Музыка написана мной. Есть проект",
        "Сгенерирована в ИИ (платно)",
        "Сгенерирована в ИИ (бесплатно)",
        "Купил музыку. Есть договор/чек",
        "Скачал в интернете бесплатно",
      ]
      const lyricsRightsAllowed = [
        "Являюсь автором текста",
        "Является общественным достоянием",
        "Текст сгенерирован ИИ",
        "Купил текст. Есть договор/чек",
        "Скачал в интернете бесплатно",
      ]
      const performanceRightsAllowed = [
        "Являюсь исполнителем песни",
        "Исполнитель ИИ",
        "Исполнитель другой человек. Являюсь правообладалетелем",
      ]
      if (!musicRightsAllowed.includes(meta.musicRights ?? "")) {
        return NextResponse.json(
          { error: `Для трека "${meta.trackName}" необходимо выбрать "Права на музыку"` },
          { status: 400 }
        )
      }
      if (
        musicRightsRequiresAiService(meta.musicRights ?? "") &&
        (!meta.musicAiService || meta.musicAiService.trim().length < 2)
      ) {
        return NextResponse.json(
          { error: `Для трека "${meta.trackName}" укажите название/ссылку на ИИ сервис` },
          { status: 400 }
        )
      }
      const isInstrumental = Boolean(meta.isInstrumental)
      if (!isInstrumental) {
        if (!lyricsRightsAllowed.includes(meta.lyricsRights ?? "")) {
          return NextResponse.json(
            { error: `Для трека "${meta.trackName}" необходимо выбрать "Права на текст"` },
            { status: 400 }
          )
        }
        if (!performanceRightsAllowed.includes(meta.performanceRights ?? "")) {
          return NextResponse.json(
            { error: `Для трека "${meta.trackName}" необходимо выбрать "Права на исполнение"` },
            { status: 400 }
          )
        }
      }
      if (!GENRES.includes(meta.genre as (typeof GENRES)[number])) {
        return NextResponse.json(
          {
            error:
              "Неверный жанр. Допустимые: Hip-Hop, R&B, Pop, Electronic, Indie Rock, Alternative Rock, Other",
          },
          { status: 400 }
        )
      }
      const audioFile = multipart.getFile(`audio_${meta.tempId}`)
      if (!audioFile) {
        return NextResponse.json(
          { error: `Для трека "${meta.trackName}" не найден аудиофайл` },
          { status: 400 }
        )
      }
      const audioExt = audioFile.originalFilename.toLowerCase().split(".").pop()
      if (audioExt !== "wav") {
        return NextResponse.json(
          { error: `Аудио для трека "${meta.trackName}" должно быть в формате WAV` },
          { status: 400 }
        )
      }
      if (audioFile.size > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          {
            error: `Размер аудиофайла для трека "${meta.trackName}" не должен превышать 80 MB`,
          },
          { status: 400 }
        )
      }
    }

    const audioDir = await getAudioDir()
    const coversDir = await getCoversDir()

    const albumId = crypto.randomUUID()
    const coverPath = path.join(coversDir, `album-${albumId}.${coverExt}`)
    const coverValidationError = await validateCabinetCoverImageFromFilePath(
      coverFile.tempFilePath,
      coverExt,
      coverFile.size
    )
    if (coverValidationError) {
      return NextResponse.json({ error: coverValidationError }, { status: 400 })
    }

    await copyFileToPathAtomic(coverFile.tempFilePath, coverPath)

    const album = await createAlbum({
      userId: session.email,
      title: albumTitle,
      artistName: albumArtistName,
      labelName,
      coverPath,
      releaseDate,
    })

    const createdTracks = []
    for (const meta of tracksMeta) {
      const audioFile = multipart.getFile(`audio_${meta.tempId}`)
      if (!audioFile) continue

      const trackId = crypto.randomUUID()
      const audioPath = path.join(audioDir, `${trackId}.wav`)
      await copyFileToPathAtomic(audioFile.tempFilePath, audioPath)

      const track = await createTrack({
        userId: session.email,
        albumId: album.id,
        trackName: meta.trackName,
        artistName: albumArtistName,
        labelName,
        genre: meta.genre as (typeof GENRES)[number],
        mood: (meta.mood ?? "") as (typeof TRACK_MOODS)[number],
        shortDescription: meta.shortDescription ?? "",
        lyricsText: meta.lyricsText ?? "",
        lyricsAuthor: meta.lyricsAuthor ?? "",
        musicAuthor: meta.musicAuthor ?? "",
        musicRights: meta.musicRights ?? "",
        musicAiService: meta.musicAiService ?? "",
        lyricsRights: meta.isInstrumental ? "" : (meta.lyricsRights ?? ""),
        performanceRights: meta.isInstrumental ? "" : (meta.performanceRights ?? ""),
        isInstrumental: Boolean(meta.isInstrumental),
        backingAuthor: meta.backingAuthor ?? "",
        coverPath,
        audioPath,
        status: "on_moderation",
        releaseDate,
      })

      createdTracks.push(track)
    }

    try {
      const db = getDb()
      const clientIp = getClientIp(request)
      const userAgent = getUserAgent(request)
      for (const t of createdTracks) {
        tryRecordLicenseAcceptanceForTrack(db, {
          userEmail: t.userId,
          trackId: t.id,
          occurredAtIso: t.createdAt,
          clientIp,
          userAgent,
        })
      }
    } catch (legalErr) {
      console.error("[cabinet/albums] legal acceptance log failed:", legalErr)
    }

      return NextResponse.json(
        {
          album,
          tracks: createdTracks,
        },
        { status: 201 }
      )
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error uploading album:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить альбом" },
      { status: 500 }
    )
  }
}

