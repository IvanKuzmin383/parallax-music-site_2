import { GENRES, TRACK_LYRICS_LANGUAGES, TRACK_MOODS, musicRightsRequiresAiService } from "@/lib/track-constants"
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
  | "lyricsLanguage"
  | "isrc"
  | "audioPath"
  | "hasExplicitLanguage"
  | "previousDistributor"
  | "originalReleaseDate"
  | "tiktokSoundStartSec"
  | "lyricsMatchConfirmed"

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
  lyricsLanguage: "Язык текста",
  isrc: "ISRC",
  audioPath: "Аудиофайл",
  hasExplicitLanguage: "Ненормативная лексика",
  previousDistributor: "Предыдущий дистрибьютор",
  originalReleaseDate: "Оригинальная дата релиза",
  tiktokSoundStartSec: "Начало звука в ТикТок",
  lyricsMatchConfirmed: "Подтверждение текста песни",
}

export type ValidateTrackMetadataOptions = {
  /** По умолчанию true - для финальной отправки. На шаге «Дополнительно» можно отключить. */
  requireAudio?: boolean
  /**
   * Требовать чекбокс подтверждения текста (кабинетный визард).
   * Если true - нужен `lyricsMatchConfirmed: true` (не для инструментала).
   */
  requireLyricsMatchConfirmed?: boolean
  lyricsMatchConfirmed?: boolean
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
    if (
      !TRACK_LYRICS_LANGUAGES.includes(
        track.lyricsLanguage.trim() as (typeof TRACK_LYRICS_LANGUAGES)[number]
      )
    ) {
      missing.push("lyricsLanguage")
    }
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
    if (track.hasExplicitLanguage !== true && track.hasExplicitLanguage !== false) {
      missing.push("hasExplicitLanguage")
    }
    if (
      options?.requireLyricsMatchConfirmed &&
      options.lyricsMatchConfirmed !== true
    ) {
      missing.push("lyricsMatchConfirmed")
    }
  }
  if (
    track.transferFromOtherDistributor &&
    (track.previousDistributor ?? "").trim().length < 2
  ) {
    missing.push("previousDistributor")
  }
  if (
    track.transferFromOtherDistributor &&
    !/^\d{4}-\d{2}-\d{2}$/.test((track.originalReleaseDate ?? "").trim())
  ) {
    missing.push("originalReleaseDate")
  }
  if (
    track.tiktokSoundStartSec != null &&
    (!Number.isFinite(track.tiktokSoundStartSec) || track.tiktokSoundStartSec < 0)
  ) {
    missing.push("tiktokSoundStartSec")
  }
  if (requireAudio && !track.audioPath) {
    missing.push("audioPath")
  }
  return missing
}

export type TrackMetadataIssue = {
  field: TrackMetadataFieldKey
  message: string
}

export function getFirstTrackMetadataIssue(
  track: Track,
  options?: ValidateTrackMetadataOptions
): TrackMetadataIssue | null {
  const missing = getIncompleteTrackMetadataFields(track, options)
  if (missing.length === 0) return null
  const field = missing[0]
  const label = track.trackName.trim() || "Трек"
  const fieldLabel = TRACK_METADATA_FIELD_LABELS[field]
  return {
    field,
    message: `Заполните «${fieldLabel}» для «${label}»`,
  }
}

/** Проверка обязательных метаданных трека (шаг «Дополнительно» / submit). */
export function validateTrackMetadata(
  track: Track,
  options?: ValidateTrackMetadataOptions
): string | null {
  return getFirstTrackMetadataIssue(track, options)?.message ?? null
}
