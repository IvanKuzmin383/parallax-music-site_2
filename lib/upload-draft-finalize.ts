import path from "path"
import { promises as fs } from "fs"
import crypto from "crypto"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { getUploadArtistPolicyViolationWithSlots } from "@/lib/cabinet-upload-artist-policy"
import { assertUploadDraftBundlePayment } from "@/lib/cabinet-upload-draft-addons"
import {
  getUploadDraftById,
  getUploadDraftsDir,
  markUploadDraftFinalized,
  removeUploadDraftFiles,
  updateUploadDraft,
  type UploadDraft,
} from "@/lib/upload-drafts"
import { validateCabinetCoverImageFromFilePath } from "@/lib/cabinet-cover-validation"
import { createTrack, getAudioDir, getCoversDir, getTrackById, getTracksByAlbumId, updateTrack, type Track } from "@/lib/tracks"
import { GENRES, TRACK_MOODS } from "@/lib/track-constants"
import { createAlbum, type Album } from "@/lib/albums"
import { validateWavFormatFromFilePath } from "@/lib/node-wav-validation"
import { getEffectiveReleaseLabelName } from "@/lib/release-label"
import { getDb } from "@/lib/db"
import {
  backfillMissingTrackAcceptancesForUser,
  tryRecordLicenseAcceptanceForTrack,
} from "@/lib/legal-acceptance"

export type FinalizeUploadDraftContext = {
  clientIp?: string | null
  userAgent?: string | null
}

function logLicenseAcceptancesForTracks(
  tracks: Track[],
  context?: FinalizeUploadDraftContext,
  options?: { occurredAtIso?: string }
): void {
  if (tracks.length === 0) return
  try {
    const db = getDb()
    for (const t of tracks) {
      tryRecordLicenseAcceptanceForTrack(db, {
        userEmail: t.userId,
        trackId: t.id,
        occurredAtIso: options?.occurredAtIso ?? t.createdAt,
        clientIp: context?.clientIp ?? null,
        userAgent: context?.userAgent ?? null,
      })
    }
  } catch (legalErr) {
    console.error("[upload-draft-finalize] legal acceptance log failed:", legalErr)
  }
}

function ensureUserTrackAcceptancesInJournal(ownerEmail: string): void {
  try {
    const db = getDb()
    backfillMissingTrackAcceptancesForUser(db, ownerEmail)
  } catch (legalErr) {
    console.error("[upload-draft-finalize] legal acceptance backfill failed:", legalErr)
  }
}

function readSingleTrackTransferFromPayload(payload: {
  transferFromOtherDistributor?: unknown
  transferUpc?: unknown
  transferIsrc?: unknown
}):
  | { ok: true; transfer: boolean; upc: string | null; isrc: string | null }
  | { ok: false; error: string } {
  const transfer = Boolean(payload.transferFromOtherDistributor)
  const upc = `${payload.transferUpc ?? ""}`.trim()
  const isrc = `${payload.transferIsrc ?? ""}`.trim()
  if (transfer) {
    if (!upc || !isrc) {
      return {
        ok: false,
        error: "Для переноса с другого дистрибьютора укажите UPC и ISRC",
      }
    }
    if (upc.length > 32) return { ok: false, error: "UPC не длиннее 32 символов" }
    if (isrc.length > 32) return { ok: false, error: "ISRC не длиннее 32 символов" }
    return { ok: true, transfer: true, upc, isrc }
  }
  return { ok: true, transfer: false, upc: null, isrc: null }
}

type AlbumDraftTrackPayload = {
  tempId?: string
  trackName?: string
  genre?: string
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
  audioRelPath?: string
}

export type FinalizeUploadDraftResult =
  | {
      ok: true
      draft: UploadDraft
      track?: Track
      tracks?: Track[]
      album?: Album
      albumId?: string
    }
  | { ok: false; error: string; status: number }

/**
 * Создаёт трек(и) из черновика и переводит черновик в finalized - та же логика, что POST finalize в кабинете.
 * Владелец треков - `draft.userId` (email кабинета).
 */
export async function finalizeUploadDraftCore(
  draft: UploadDraft,
  context?: FinalizeUploadDraftContext
): Promise<FinalizeUploadDraftResult> {
  if (draft.status === "finalized") {
    const current = await getUploadDraftById(draft.id)
    return { ok: true, draft: current ?? draft }
  }

  const ownerEmail = draft.userId

  const paymentGate = await assertUploadDraftBundlePayment(draft.payload, draft.bundleOrderId)
  if (!paymentGate.ok) {
    return { ok: false, error: paymentGate.error, status: 400 }
  }

  const audioDir = await getAudioDir()
  const coversDir = await getCoversDir()
  const draftsDir = await getUploadDraftsDir()
  const payload = draft.payload

  const readAndValidateSingleDraftAudio = async (): Promise<{ absPath: string }> => {
    const absPath = path.join(draftsDir, draft.audioRelPath!)
    try {
      await fs.access(absPath)
    } catch {
      throw new Error("Файл аудио в черновике не найден")
    }
    const wavError = await validateWavFormatFromFilePath(absPath)
    if (wavError) {
      throw new Error(wavError)
    }
    return { absPath }
  }

  if (draft.kind === "album") {
    if (draft.albumId) {
      const tracks = await getTracksByAlbumId(draft.albumId)
      for (const t of tracks) {
        if (t.status === "upload_pending") {
          await updateTrack(t.id, { status: "on_moderation" })
        }
      }
      logLicenseAcceptancesForTracks(tracks, context, { occurredAtIso: new Date().toISOString() })
      ensureUserTrackAcceptancesInJournal(ownerEmail)
      await removeUploadDraftFiles(draft)
      const updated = await markUploadDraftFinalized(draft.id)
      if (!updated) return { ok: false, error: "Не удалось обновить черновик", status: 500 }
      return { ok: true, draft: updated, albumId: draft.albumId }
    }

    const albumTitle = `${payload.albumTitle ?? ""}`.trim()
    const albumArtistName = `${payload.albumArtistName ?? ""}`.trim()
    const releaseDate =
      typeof payload.releaseDate === "string" && payload.releaseDate.trim().length > 0
        ? payload.releaseDate.trim()
        : undefined
    const tracksRaw = Array.isArray(payload.albumTracks)
      ? (payload.albumTracks as AlbumDraftTrackPayload[])
      : []

    if (!albumTitle || !albumArtistName || tracksRaw.length < 2) {
      return { ok: false, error: "Черновик альбома содержит неполные данные", status: 400 }
    }

    const user = await getCabinetUserByEmail(ownerEmail)
    if (!user) return { ok: false, error: "Пользователь не найден", status: 404 }
    const releaseLabelName = getEffectiveReleaseLabelName(payload.labelName, user.subscriptionName)

    const artistPolicyErr = await getUploadArtistPolicyViolationWithSlots(user, albumArtistName)
    if (artistPolicyErr) return { ok: false, error: artistPolicyErr, status: 400 }

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

    for (let i = 0; i < tracksRaw.length; i++) {
      const t = tracksRaw[i]
      const title = `${t.trackName ?? ""}`.trim()
      const genre = `${t.genre ?? ""}`.trim()
      const mood = `${t.mood ?? ""}`.trim()
      const label = title || `Трек ${i + 1}`
      if (!title || !GENRES.includes(genre as (typeof GENRES)[number])) {
        return { ok: false, error: `Укажите название и жанр для "${label}"`, status: 400 }
      }
      if (!TRACK_MOODS.includes(mood as (typeof TRACK_MOODS)[number])) {
        return { ok: false, error: `Выберите настроение для "${label}"`, status: 400 }
      }
      if ((`${t.shortDescription ?? ""}`).trim().length < 2) {
        return { ok: false, error: `Заполните краткое описание для "${label}"`, status: 400 }
      }
      if (!musicRightsAllowed.includes(`${t.musicRights ?? ""}`.trim())) {
        return { ok: false, error: `Выберите права на музыку для "${label}"`, status: 400 }
      }
      const isInstrumental = Boolean(t.isInstrumental)
      if (!isInstrumental) {
        if (!lyricsRightsAllowed.includes(`${t.lyricsRights ?? ""}`.trim())) {
          return { ok: false, error: `Выберите права на текст для "${label}"`, status: 400 }
        }
        if (!performanceRightsAllowed.includes(`${t.performanceRights ?? ""}`.trim())) {
          return { ok: false, error: `Выберите права на исполнение для "${label}"`, status: 400 }
        }
      }
      if (!t.audioRelPath) {
        return { ok: false, error: `Добавьте аудио WAV для "${label}"`, status: 400 }
      }
    }

    if (!draft.coverRelPath && !Boolean(payload.addons?.trackCover?.enabled)) {
      return {
        ok: false,
        error: "Загрузите обложку альбома или включите услугу «Обложка для релиза»",
        status: 400,
      }
    }

    let coverPath = ""
    if (draft.coverRelPath) {
      const coverSrc = path.join(draftsDir, draft.coverRelPath)
      let coverStat: { size: number }
      try {
        coverStat = await fs.stat(coverSrc)
      } catch {
        return { ok: false, error: "Файл обложки в черновике не найден", status: 400 }
      }
      const coverExt = path.extname(draft.coverRelPath).replace(".", "").toLowerCase() || "jpg"
      const coverError = await validateCabinetCoverImageFromFilePath(coverSrc, coverExt, coverStat.size)
      if (coverError) return { ok: false, error: coverError, status: 400 }
      const albumCoverId = crypto.randomUUID()
      coverPath = path.join(coversDir, `album-${albumCoverId}.${coverExt}`)
      await fs.copyFile(coverSrc, coverPath)
    }

    const preparedTracks: {
      meta: AlbumDraftTrackPayload
      draftAudioAbs: string
    }[] = []
    for (const t of tracksRaw) {
      const audioRelPath = t.audioRelPath!
      const draftAudioAbs = path.join(draftsDir, audioRelPath)
      try {
        await fs.access(draftAudioAbs)
      } catch {
        return {
          ok: false,
          error: `Файл аудио "${`${t.trackName ?? "Без названия"}`.trim()}" в черновике не найден`,
          status: 400,
        }
      }
      const wavError = await validateWavFormatFromFilePath(draftAudioAbs)
      if (wavError) {
        return {
          ok: false,
          error: `Трек "${`${t.trackName ?? "Без названия"}`.trim()}": ${wavError}`,
          status: 400,
        }
      }
      preparedTracks.push({ meta: t, draftAudioAbs })
    }

    const album = await createAlbum({
      userId: ownerEmail,
      title: albumTitle,
      artistName: albumArtistName,
      labelName: releaseLabelName,
      coverPath,
      releaseDate,
    })

    const createdTracks: Track[] = []
    for (const prepared of preparedTracks) {
      const t = prepared.meta

      const trackId = crypto.randomUUID()
      const audioPath = path.join(audioDir, `${trackId}.wav`)
      await fs.copyFile(prepared.draftAudioAbs, audioPath)

      const safeMood = TRACK_MOODS.includes((`${t.mood ?? ""}`.trim() as (typeof TRACK_MOODS)[number]))
        ? (`${t.mood ?? ""}`.trim() as (typeof TRACK_MOODS)[number])
        : TRACK_MOODS[0]

      const track = await createTrack({
        userId: ownerEmail,
        albumId: album.id,
        trackName: `${t.trackName ?? ""}`.trim(),
        artistName: albumArtistName,
        labelName: releaseLabelName,
        genre: `${t.genre ?? ""}`.trim() as (typeof GENRES)[number],
        mood: safeMood,
        shortDescription: `${t.shortDescription ?? ""}`,
        lyricsText: `${t.lyricsText ?? ""}`,
        lyricsAuthor: `${t.lyricsAuthor ?? ""}`,
        musicAuthor: `${t.musicAuthor ?? ""}`,
        musicRights: `${t.musicRights ?? ""}`,
        musicAiService: `${t.musicAiService ?? ""}`,
        lyricsRights: Boolean(t.isInstrumental) ? "" : `${t.lyricsRights ?? ""}`,
        performanceRights: Boolean(t.isInstrumental) ? "" : `${t.performanceRights ?? ""}`,
        isInstrumental: Boolean(t.isInstrumental),
        backingAuthor: `${t.backingAuthor ?? ""}`,
        coverPath,
        audioPath,
        status: "on_moderation",
        releaseDate,
      })
      createdTracks.push(track)
    }

    logLicenseAcceptancesForTracks(createdTracks, context)
    ensureUserTrackAcceptancesInJournal(ownerEmail)
    await removeUploadDraftFiles(draft)
    const updated = await updateUploadDraft(draft.id, { status: "finalized", albumId: album.id })
    if (!updated) return { ok: false, error: "Не удалось обновить черновик", status: 500 }
    return { ok: true, draft: updated, album, tracks: createdTracks }
  }

  const trackName = `${payload.trackName ?? ""}`.trim()
  const artistName = `${payload.artistName ?? ""}`.trim()
  const genre = `${payload.genre ?? ""}`.trim()
  const mood = `${payload.mood ?? ""}`.trim()
  if (!trackName || !artistName || !GENRES.includes(genre as (typeof GENRES)[number])) {
    return { ok: false, error: "Черновик содержит неполные данные трека", status: 400 }
  }
  const user = await getCabinetUserByEmail(ownerEmail)
  if (!user) return { ok: false, error: "Пользователь не найден", status: 404 }
  const releaseLabelName = getEffectiveReleaseLabelName(payload.labelName, user.subscriptionName)
  const artistPolicyErr = await getUploadArtistPolicyViolationWithSlots(user, artistName)
  if (artistPolicyErr) return { ok: false, error: artistPolicyErr, status: 400 }

  if (!draft.coverRelPath && !Boolean(payload.requestAiCover)) {
    return {
      ok: false,
      error: "Добавьте обложку в черновик или отметьте заказ AI-обложки",
      status: 400,
    }
  }

  const safeMood = TRACK_MOODS.includes(mood as (typeof TRACK_MOODS)[number]) ? mood : TRACK_MOODS[0]
  if (!draft.audioRelPath) return { ok: false, error: "В черновике отсутствует аудио", status: 400 }

  const sourceTrackId =
    typeof payload.sourceTrackId === "string" && payload.sourceTrackId.trim().length > 0
      ? payload.sourceTrackId.trim()
      : null

  if (sourceTrackId) {
    const sourceTrack = await getTrackById(sourceTrackId)
    if (!sourceTrack || sourceTrack.userId.toLowerCase() !== ownerEmail.toLowerCase()) {
      return { ok: false, error: "Исходный трек для редактирования не найден", status: 404 }
    }
    if (sourceTrack.status !== "upload_pending") {
      return {
        ok: false,
        error: "Редактирование доступно только для треков в статусе «Черновик»",
        status: 400,
      }
    }

    let draftAudio: { absPath: string }
    try {
      draftAudio = await readAndValidateSingleDraftAudio()
    } catch (error) {
      return {
        ok: false,
        error: (error as Error).message || "Не удалось проверить аудио черновика",
        status: 400,
      }
    }
    await fs.copyFile(draftAudio.absPath, sourceTrack.audioPath)

    let coverPath = ""
    if (draft.coverRelPath) {
      const coverSrc = path.join(draftsDir, draft.coverRelPath)
      let coverStat: { size: number }
      try {
        coverStat = await fs.stat(coverSrc)
      } catch {
        return { ok: false, error: "Файл обложки в черновике не найден", status: 400 }
      }
      const coverExt = path.extname(draft.coverRelPath).replace(".", "").toLowerCase() || "jpg"
      const coverError = await validateCabinetCoverImageFromFilePath(coverSrc, coverExt, coverStat.size)
      if (coverError) return { ok: false, error: coverError, status: 400 }
      coverPath = path.join(coversDir, `${sourceTrack.id}.${coverExt}`)
      await fs.copyFile(coverSrc, coverPath)
    }

    const xfer = readSingleTrackTransferFromPayload(payload)
    if (!xfer.ok) {
      return { ok: false, error: xfer.error, status: 400 }
    }

    const track = await updateTrack(sourceTrack.id, {
      trackName,
      artistName,
      labelName: releaseLabelName,
      genre: genre as (typeof GENRES)[number],
      mood: safeMood as (typeof TRACK_MOODS)[number],
      shortDescription: `${payload.shortDescription ?? ""}`,
      lyricsText: `${payload.lyricsText ?? ""}`,
      lyricsAuthor: `${payload.lyricsAuthor ?? ""}`,
      musicAuthor: `${payload.musicAuthor ?? ""}`,
      musicRights: `${payload.musicRights ?? ""}`,
      musicAiService: `${payload.musicAiService ?? ""}`,
      lyricsRights: `${payload.lyricsRights ?? ""}`,
      performanceRights: `${payload.performanceRights ?? ""}`,
      isInstrumental: Boolean(payload.isInstrumental),
      backingAuthor: `${payload.backingAuthor ?? ""}`,
      coverPath,
      needsAiCover: !coverPath,
      status: "on_moderation",
      releaseDate: typeof payload.releaseDate === "string" ? payload.releaseDate : undefined,
      upc: xfer.upc,
      isrc: xfer.isrc,
      transferFromOtherDistributor: xfer.transfer,
    })

    if (!track) return { ok: false, error: "Не удалось обновить трек", status: 500 }

    await removeUploadDraftFiles(draft)
    const updated = await markUploadDraftFinalized(draft.id)
    if (!updated) return { ok: false, error: "Не удалось обновить черновик", status: 500 }
    return { ok: true, draft: updated, track }
  }

  const trackId = crypto.randomUUID()
  const audioPath = path.join(audioDir, `${trackId}.wav`)
  let draftAudio: { absPath: string }
  try {
    draftAudio = await readAndValidateSingleDraftAudio()
  } catch (error) {
    return {
      ok: false,
      error: (error as Error).message || "Не удалось проверить аудио черновика",
      status: 400,
    }
  }
  await fs.copyFile(draftAudio.absPath, audioPath)

  let coverPath = ""
  if (draft.coverRelPath) {
    const coverSrc = path.join(draftsDir, draft.coverRelPath)
    let coverStat: { size: number }
    try {
      coverStat = await fs.stat(coverSrc)
    } catch {
      return { ok: false, error: "Файл обложки в черновике не найден", status: 400 }
    }
    const coverExt = path.extname(draft.coverRelPath).replace(".", "").toLowerCase() || "jpg"
    const coverError = await validateCabinetCoverImageFromFilePath(coverSrc, coverExt, coverStat.size)
    if (coverError) return { ok: false, error: coverError, status: 400 }
    coverPath = path.join(coversDir, `${trackId}.${coverExt}`)
    await fs.copyFile(coverSrc, coverPath)
  }

  const xferNew = readSingleTrackTransferFromPayload(payload)
  if (!xferNew.ok) {
    return { ok: false, error: xferNew.error, status: 400 }
  }

  const track = await createTrack({
    userId: ownerEmail,
    trackName,
    artistName,
    labelName: releaseLabelName,
    genre: genre as (typeof GENRES)[number],
    mood: safeMood as (typeof TRACK_MOODS)[number],
    shortDescription: `${payload.shortDescription ?? ""}`,
    lyricsText: `${payload.lyricsText ?? ""}`,
    lyricsAuthor: `${payload.lyricsAuthor ?? ""}`,
    musicAuthor: `${payload.musicAuthor ?? ""}`,
    musicRights: `${payload.musicRights ?? ""}`,
    musicAiService: `${payload.musicAiService ?? ""}`,
    lyricsRights: `${payload.lyricsRights ?? ""}`,
    performanceRights: `${payload.performanceRights ?? ""}`,
    isInstrumental: Boolean(payload.isInstrumental),
    backingAuthor: `${payload.backingAuthor ?? ""}`,
    coverPath,
    needsAiCover: !coverPath,
    audioPath,
    status: "on_moderation",
    releaseDate: typeof payload.releaseDate === "string" ? payload.releaseDate : undefined,
    upc: xferNew.upc ?? undefined,
    isrc: xferNew.isrc ?? undefined,
    transferFromOtherDistributor: xferNew.transfer,
  })

  logLicenseAcceptancesForTracks([track], context)
  ensureUserTrackAcceptancesInJournal(ownerEmail)
  await removeUploadDraftFiles(draft)
  const updated = await markUploadDraftFinalized(draft.id)
  if (!updated) return { ok: false, error: "Не удалось обновить черновик", status: 500 }
  return { ok: true, draft: updated, track }
}
