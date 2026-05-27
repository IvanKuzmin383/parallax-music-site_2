import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import path from "node:path"
import { getCabinetToken, getCabinetSession } from "@/lib/cabinet-auth"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { checkProfileCompleteForUpload } from "@/lib/cabinet-upload-profile-gate"
import { getEffectiveTrackLimit } from "@/lib/subscription-plans"
import { getUploadArtistPolicyViolationWithSlots } from "@/lib/cabinet-upload-artist-policy"
import { getTracksByUserId } from "@/lib/tracks"
import { createTrack, getAudioDir, getCoversDir, GENRES, TRACK_MOODS } from "@/lib/tracks"
import { musicRightsRequiresAiService } from "@/lib/track-constants"
import { getDb } from "@/lib/db"
import { getClientIp, getUserAgent, tryRecordLicenseAcceptanceForTrack } from "@/lib/legal-acceptance"
import { copyFileToPathAtomic } from "@/lib/node-atomic-upload"
import {
  MultipartRequestError,
  parseMultipartRequestStream,
} from "@/lib/node-streaming-multipart"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"
import { isYyyyMmDdReleaseWeekend } from "@/lib/release-date-validation"
import { validateCabinetCoverImageFromFilePath } from "@/lib/cabinet-cover-validation"
import { getEffectiveReleaseLabelName } from "@/lib/release-label"

const MAX_AUDIO_SIZE = 80 * 1024 * 1024 // 80 MB

export async function GET(request: NextRequest) {
  const token = getCabinetToken(request)
  const session = getCabinetSession(token)
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 })
  }

  try {
    const tracks = await getTracksByUserId(session.email)
    return NextResponse.json({ tracks })
  } catch (error) {
    console.error("Error fetching cabinet tracks:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить треки" },
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
    const existingTracks = await getTracksByUserId(session.email)
    if (limit !== null && existingTracks.length >= limit) {
      return NextResponse.json(
        {
          error: `Текущий тариф предусматривает не более ${limit} активных релизов. Чтобы загрузить больше, необходимо расширить подписку или оплатить дополнительные треки.`,
        },
        { status: 403 }
      )
    }

    const profileGate = checkProfileCompleteForUpload(user)
    if (profileGate) {
      return NextResponse.json(profileGate.body, { status: profileGate.status })
    }

    const multipart = await parseMultipartRequestStream(request, {
      maxFiles: 2,
      maxFields: 40,
      maxFileSizeBytes: MAX_AUDIO_SIZE,
      maxFieldSizeBytes: 128 * 1024,
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

      const trackName = multipart.getField("trackName")?.trim()
      const artistName = multipart.getField("artistName")?.trim()
      const labelNameRaw = multipart.getField("labelName")
      const genre = multipart.getField("genre")
      const mood = multipart.getField("mood")?.trim() ?? ""
      const shortDescription = multipart.getField("shortDescription")?.trim() ?? ""
      const lyricsText = multipart.getField("lyricsText")?.trim() ?? ""
      const lyricsAuthor = multipart.getField("lyricsAuthor")?.trim() ?? ""
      const musicAuthor = multipart.getField("musicAuthor")?.trim() ?? ""
      const musicRights = multipart.getField("musicRights")?.trim() ?? ""
      const musicAiService = multipart.getField("musicAiService")?.trim() ?? ""
      const isInstrumentalRaw = multipart.getField("isInstrumental")
      const lyricsRights = multipart.getField("lyricsRights")?.trim() ?? ""
      const performanceRights = multipart.getField("performanceRights")?.trim() ?? ""
      const backingAuthor = multipart.getField("backingAuthor")?.trim() ?? ""
      const releaseDateStr = multipart.getField("releaseDate")
      const audioFile = multipart.getFile("audio")
      const coverFile = multipart.getFile("cover")
      const requestAiCover = multipart.getField("requestAiCover") === "true"
      const labelName = getEffectiveReleaseLabelName(labelNameRaw, user.subscriptionName)

      if (requestAiCover) {
        return NextResponse.json(
          {
            error:
              "Заказ ИИ-обложки доступен только через форму загрузки в кабинете с оплатой услуги",
          },
          { status: 400 }
        )
      }

      if (!trackName || !artistName || !genre || !audioFile || !releaseDateStr) {
        return NextResponse.json(
          {
            error:
              "Обязательные поля: название трека, исполнитель, жанр, дата публикации, аудио (WAV), обложка или заказ ИИ-обложки",
          },
          { status: 400 }
        )
      }

      if (requestAiCover && coverFile && coverFile.size > 0) {
        return NextResponse.json(
          {
            error:
              "При заказе ИИ-обложки не прикрепляйте файл обложки. Снимите галочку, если хотите загрузить свою обложку.",
          },
          { status: 400 }
        )
      }

      if (!requestAiCover && (!coverFile || coverFile.size === 0)) {
        return NextResponse.json(
          { error: "Загрузите обложку или отметьте «Сделать ИИ обложку»" },
          { status: 400 }
        )
      }
      const artistPolicyError = await getUploadArtistPolicyViolationWithSlots(user, artistName)
      if (artistPolicyError) {
        return NextResponse.json({ error: artistPolicyError }, { status: 400 })
      }
      if (!TRACK_MOODS.includes(mood as (typeof TRACK_MOODS)[number])) {
        return NextResponse.json(
          { error: "Поле \"Настроение трека\" обязательно для заполнения" },
          { status: 400 }
        )
      }
      if (shortDescription.length < 2) {
        return NextResponse.json(
          { error: "Поле \"Краткое описание трека\" обязательно для заполнения" },
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
      if (!musicRightsAllowed.includes(musicRights)) {
        return NextResponse.json(
          { error: "Поле \"Права на музыку\" обязательно для заполнения" },
          { status: 400 }
        )
      }
      if (musicRightsRequiresAiService(musicRights) && musicAiService.length < 2) {
        return NextResponse.json(
          { error: "Укажите название/ссылку на ИИ сервис" },
          { status: 400 }
        )
      }
      if (isInstrumentalRaw !== "true" && isInstrumentalRaw !== "false") {
        return NextResponse.json(
          { error: "Поле \"Это инструментал\" обязательно для заполнения" },
          { status: 400 }
        )
      }
      const isInstrumental = isInstrumentalRaw === "true"
      if (!isInstrumental) {
        if (!lyricsRightsAllowed.includes(lyricsRights)) {
          return NextResponse.json(
            { error: "Поле \"Права на текст\" обязательно для заполнения" },
            { status: 400 }
          )
        }
        if (!performanceRightsAllowed.includes(performanceRights)) {
          return NextResponse.json(
            { error: "Поле \"Права на исполнение\" обязательно для заполнения" },
            { status: 400 }
          )
        }
      }

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

      if (!GENRES.includes(genre as (typeof GENRES)[number])) {
        return NextResponse.json(
          {
            error:
              "Неверный жанр. Допустимые: Hip-Hop, R&B, Pop, Electronic, Indie Rock, Alternative Rock, Other",
          },
          { status: 400 }
        )
      }

      const audioExt = audioFile.originalFilename.toLowerCase().split(".").pop()
      if (audioExt !== "wav") {
        return NextResponse.json(
          { error: "Аудио должно быть в формате WAV" },
          { status: 400 }
        )
      }

      if (audioFile.size > MAX_AUDIO_SIZE) {
        return NextResponse.json(
          { error: "Размер аудиофайла не должен превышать 80 MB" },
          { status: 400 }
        )
      }

      let coverExt: string | undefined
      if (!requestAiCover && coverFile) {
        coverExt = coverFile.originalFilename.toLowerCase().split(".").pop()
      }

      const trackId = crypto.randomUUID()
      const audioDir = await getAudioDir()

      const audioPath = path.join(audioDir, `${trackId}.wav`)
      const coverPath =
        !requestAiCover && coverExt
          ? path.join(await getCoversDir(), `${trackId}.${coverExt}`)
          : ""

      const wavError = await validateWavFormatFromFilePath(audioFile.tempFilePath)
      if (wavError) {
        return NextResponse.json({ error: wavError }, { status: 400 })
      }

      if (!requestAiCover && coverFile) {
        const coverErr = await validateCabinetCoverImageFromFilePath(
          coverFile.tempFilePath,
          coverExt,
          coverFile.size
        )
        if (coverErr) {
          return NextResponse.json({ error: coverErr }, { status: 400 })
        }
      }

      await copyFileToPathAtomic(audioFile.tempFilePath, audioPath)
      if (!requestAiCover && coverPath && coverFile) {
        await copyFileToPathAtomic(coverFile.tempFilePath, coverPath)
      }

      const track = await createTrack({
        userId: session.email,
        trackName,
        artistName,
        labelName,
        genre: genre as (typeof GENRES)[number],
        mood: mood as (typeof TRACK_MOODS)[number],
        shortDescription,
        lyricsText,
        lyricsAuthor,
        musicAuthor,
        musicRights,
        musicAiService,
        lyricsRights: isInstrumental ? "" : lyricsRights,
        performanceRights: isInstrumental ? "" : performanceRights,
        isInstrumental,
        backingAuthor,
        coverPath,
        needsAiCover: requestAiCover,
        audioPath,
        status: "on_moderation",
        releaseDate,
      })

      try {
        const db = getDb()
        tryRecordLicenseAcceptanceForTrack(db, {
          userEmail: track.userId,
          trackId: track.id,
          occurredAtIso: track.createdAt,
          clientIp: getClientIp(request),
          userAgent: getUserAgent(request),
        })
      } catch (legalErr) {
        console.error("[cabinet/tracks] legal acceptance log failed:", legalErr)
      }

      return NextResponse.json({ track }, { status: 201 })
    } finally {
      await multipart.cleanup()
    }
  } catch (error) {
    if (error instanceof MultipartRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    console.error("Error uploading track:", error)
    return NextResponse.json(
      { error: "Не удалось загрузить трек" },
      { status: 500 }
    )
  }
}
