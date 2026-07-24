import { GENRES, TRACK_MOODS, musicRightsRequiresAiService } from "@/lib/track-constants"
import type { Track } from "@/lib/tracks"

const MUSIC_RIGHTS_ALLOWED = [
  "Музыка написана мной. Есть проект",
  "Сгенерирована в ИИ (платно)",
  "Сгенерирована в ИИ (бесплатно)",
  "Купил музыку. Есть договор/чек",
  "Скачал в интернете бесплатно",
] as const

const LYRICS_RIGHTS_ALLOWED = [
  "Являюсь автором текста",
  "Является общественным достоянием",
  "Текст сгенерирован ИИ",
  "Купил текст. Есть договор/чек",
  "Скачал в интернете бесплатно",
] as const

const PERFORMANCE_RIGHTS_ALLOWED = [
  "Являюсь исполнителем песни",
  "Исполнитель ИИ",
  "Исполнитель другой человек. Являюсь правообладалетелем",
] as const

export type TrackMetadataFieldKey =
  | "trackName"
  | "genre"
  | "mood"
  | "shortDescription"
  | "musicAuthor"
  | "musicRights"
  | "musicAiService"
  | "lyricsRights"
  | "performanceRights"
  | "isrc"
  | "audioPath"

export const TRACK_METADATA_FIELD_LABELS: Record<TrackMetadataFieldKey, string> = {
  trackName: "Название трека",
  genre: "Жанр",
  mood: "Настроение",
  shortDescription: "Краткое описание",
  musicAuthor: "Автор музыки",
  musicRights: "Права на музыку",
  musicAiService: "ИИ-сервис",
  lyricsRights: "Права на текст",
  performanceRights: "Права на исполнение",
  isrc: "ISRC",
  audioPath: "Аудиофайл",
}

export type ValidateTrackMetadataOptions = {
  /** По умолчанию true — для финальной отправки. На шаге «Дополнительно» можно отключить. */
  requireAudio?: boolean
}

/** Все незаполненные обязательные поля трека. */
export function getIncompleteTrackMetadataFields(
  track: Track,
  options?: ValidateTrackMetadataOptions
): TrackMetadataFieldKey[] {
  const requireAudio = options?.requireAudio !== false
  const missing: TrackMetadataFieldKey[] = []

  if (!track.trackName.trim()) missing.push("trackName")
  if (!GENRES.includes(track.genre as (typeof GENRES)[number])) missing.push("genre")
  if (!TRACK_MOODS.includes(track.mood as (typeof TRACK_MOODS)[number])) missing.push("mood")
  if (track.shortDescription.trim().length < 2) missing.push("shortDescription")
  if (!track.musicAuthor.trim()) missing.push("musicAuthor")
  if (!MUSIC_RIGHTS_ALLOWED.includes(track.musicRights.trim() as (typeof MUSIC_RIGHTS_ALLOWED)[number])) {
    missing.push("musicRights")
  }
  if (musicRightsRequiresAiService(track.musicRights) && !track.musicAiService.trim()) {
    missing.push("musicAiService")
  }
  if (!track.isInstrumental) {
    if (!LYRICS_RIGHTS_ALLOWED.includes(track.lyricsRights.trim() as (typeof LYRICS_RIGHTS_ALLOWED)[number])) {
      missing.push("lyricsRights")
    }
    if (
      !PERFORMANCE_RIGHTS_ALLOWED.includes(
        track.performanceRights.trim() as (typeof PERFORMANCE_RIGHTS_ALLOWED)[number]
      )
    ) {
      missing.push("performanceRights")
    }
  }
  if (track.transferFromOtherDistributor && !(track.isrc ?? "").trim()) {
    missing.push("isrc")
  }
  if (requireAudio && !track.audioPath) {
    missing.push("audioPath")
  }
  return missing
}

/** Проверка обязательных метаданных трека (шаг «Дополнительно» / submit). */
export function validateTrackMetadata(
  track: Track,
  options?: ValidateTrackMetadataOptions
): string | null {
  const missing = getIncompleteTrackMetadataFields(track, options)
  if (missing.length === 0) return null
  const label = track.trackName.trim() || "Трек"
  const fieldLabel = TRACK_METADATA_FIELD_LABELS[missing[0]]
  return `Заполните «${fieldLabel}» для «${label}»`
}
