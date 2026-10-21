import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import type { CabinetUser } from "@/lib/cabinet-users"
import { getAiTracksResultBundleForUser } from "@/lib/ai-tracks-jobs"
import {
  AI_TRACKS_DIRECTIONS,
  AI_TRACKS_MOODS,
  type AiTracksDirectionId,
  type AiTracksMoodId,
} from "@/lib/ai-tracks-config"
import { ensureAiTracksWavFile } from "@/lib/ai-tracks-wav"
import { createRelease, listReleasesByUserId, type Release } from "@/lib/releases"
import { createTrack, getAudioDir, getUploadsBasePath } from "@/lib/tracks"
import { GENRES, TRACK_MOODS, type TrackGenre, type TrackMood } from "@/lib/track-constants"
import { getEffectiveReleaseLabelName } from "@/lib/release-label"

function safeJoinUploads(base: string, storageKey: string): string | null {
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\/+/, "")
  if (!normalized.startsWith("ai-tracks/") || normalized.includes("..")) return null
  const full = path.join(base, normalized)
  const resolved = path.resolve(full)
  const baseResolved = path.resolve(base)
  if (!resolved.startsWith(baseResolved + path.sep) && resolved !== baseResolved) return null
  return resolved
}

function mapDirectionToGenre(direction: AiTracksDirectionId | null): TrackGenre {
  if (direction === "pop") return "Pop"
  if (direction === "rap") return "Hip-Hop"
  if (direction === "electronic") return "Electronic"
  if (direction === "rock") return "Indie Rock"
  if (direction === "lofi") return "Ambient"
  return GENRES[0]
}

function mapMoodToTrackMood(mood: AiTracksMoodId | null): TrackMood {
  if (mood === "atmospheric") return "Мечтательное"
  if (mood === "energetic") return "Энергичное"
  if (mood === "romantic") return "Романтичное"
  if (mood === "melancholic") return "Грустное"
  if (mood === "calm") return "Спокойное"
  return TRACK_MOODS[0]
}

export type CreateReleaseFromAiTracksResult = {
  release: Release
  alreadyExisted: boolean
  audioAttached: boolean
  warning?: string
  uploadPath: string
}

/**
 * Создаёт черновик сингла из результата AI-генерации: аудио (+ WAV при необходимости) и текст.
 */
export async function createReleaseFromAiTracksResult(params: {
  cabinetUser: CabinetUser
  resultId: string
  titleOverride?: string
}): Promise<CreateReleaseFromAiTracksResult | { error: string; status: number }> {
  const bundle = await getAiTracksResultBundleForUser({
    userId: params.cabinetUser.id,
    resultId: params.resultId,
  })
  if (!bundle) {
    return { error: "Результат не найден", status: 404 }
  }

  const releaseUserId = params.cabinetUser.email
  const existing = (await listReleasesByUserId(releaseUserId)).find(
    (r) => r.addons?.fromAiTracksResultId === params.resultId && r.status === "draft"
  )
  if (existing) {
    return {
      release: existing,
      alreadyExisted: true,
      audioAttached: true,
      uploadPath: `/cabinet/upload/${existing.id}`,
    }
  }

  const title =
    (params.titleOverride?.trim() || bundle.result.title || bundle.settings.title || "Без названия").slice(
      0,
      120
    )
  const artistName = (params.cabinetUser.artistName || "").trim()
  const labelName = getEffectiveReleaseLabelName(undefined, params.cabinetUser.subscriptionName)
  const instrumental = bundle.settings.instrumental === true
  const lyrics = instrumental ? "" : (bundle.settings.lyrics || "").trim()
  const direction = bundle.settings.direction
  const mood = bundle.settings.mood

  const release = await createRelease({
    userId: releaseUserId,
    kind: "single",
    title,
    artistName,
    labelName,
    coverPath: "",
    wizardStep: 1,
    requestAiCover: true,
  })

  // Пометить источник до загрузки аудио, чтобы повторный клик нашёл черновик.
  const { updateRelease } = await import("@/lib/releases")
  await updateRelease(release.id, {
    addons: {
      ...release.addons,
      fromAiTracksResultId: params.resultId,
      trackCover: {
        enabled: true,
        trackTitle: title,
      },
    },
  })

  let audioAttached = false
  let warning: string | undefined

  if (!bundle.storageKey) {
    warning = "У этого варианта нет аудиофайла. Загрузите WAV вручную в карточке релиза."
  } else {
    const base = await getUploadsBasePath()
    const sourcePath = safeJoinUploads(base, bundle.storageKey)
    if (!sourcePath) {
      warning = "Некорректный путь к аудио AI-трека. Загрузите WAV вручную."
    } else {
      try {
        await fs.access(sourcePath)
      } catch {
        warning = "Файл AI-трека недоступен. Загрузите WAV вручную."
      }

      if (!warning) {
        const trackId = crypto.randomUUID()
        const audioDir = await getAudioDir()
        const audioPath = path.join(audioDir, `${trackId}.wav`)
        const prepared = await ensureAiTracksWavFile({
          sourcePath,
          format: bundle.format,
          destPath: audioPath,
        })
        if (!prepared.ok) {
          warning = prepared.error
        } else {
          const genre = mapDirectionToGenre(direction)
          const trackMood = mapMoodToTrackMood(mood)
          const directionLabel =
            direction != null
              ? AI_TRACKS_DIRECTIONS.find((d) => d.id === direction)?.label
              : null
          const moodLabel =
            mood != null ? AI_TRACKS_MOODS.find((m) => m.id === mood)?.label : null
          const styleBits = [directionLabel, moodLabel, bundle.settings.style?.trim()]
            .filter(Boolean)
            .join(" · ")

          await createTrack({
            userId: releaseUserId,
            releaseId: release.id,
            trackOrder: 0,
            trackName: title,
            artistName: artistName || "-",
            labelName,
            genre,
            mood: trackMood,
            shortDescription: styleBits.slice(0, 500),
            lyricsText: lyrics,
            lyricsLanguage: instrumental || !lyrics ? "" : "Русский",
            musicAuthor: "",
            lyricsAuthor: "",
            musicRights: "",
            musicAiService: "Parallax Studio",
            lyricsRights: "",
            performanceRights: "",
            isInstrumental: instrumental,
            backingAuthor: "",
            coverPath: "",
            audioPath,
            status: "draft",
            needsAiCover: true,
          })
          audioAttached = true
        }
      }
    }
  }

  // Если аудио не прикрепили - всё равно создаём трек-заглушку нельзя без audioPath.
  // Артист дозагрузит в мастере. Релиз уже есть с текстом в addons/trackCover comment и lyrics lost?
  // Без трека lyrics негде хранить. Создадим трек только с пустым audio? createTrack requires audioPath.
  // If no audio - store lyrics in release.aiAnalysisText as temporary? Better: create track with placeholder empty wav - bad.
  // Store lyrics in addons trackCover comment is wrong.
  // Use updateRelease aiAnalysisText for lyrics stash? Hacky.
  // Or createTrack with audioPath pointing to missing and wizard asks re-upload - broken.
  //
  // Best when no audio: put lyrics into release.aiAnalysisText prefixed, OR extend createTrack to allow empty audio for draft.
  // Looking at wizard - it needs a track. Simplest: if no audio, still return release and put lyrics in aiAnalysisText so we don't lose them, and UI toast says upload wav.
  // Actually better: write lyrics into short field on release via aiAnalysisText:

  if (!audioAttached && lyrics) {
    await updateRelease(release.id, {
      aiAnalysisText: `Текст из генерации музыки:\n\n${lyrics}`,
    })
  }

  const refreshed = (await listReleasesByUserId(releaseUserId)).find((r) => r.id === release.id) ?? release

  return {
    release: refreshed,
    alreadyExisted: false,
    audioAttached,
    warning,
    uploadPath: `/cabinet/upload/${release.id}`,
  }
}
