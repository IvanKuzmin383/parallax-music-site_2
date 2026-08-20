export const GENRES = [
  "Hip-Hop",
  "R&B",
  "Pop",
  "Electronic",
  "Indie Rock",
  "Alternative Rock",
  "Pop Rock",
  "Drum & Bass",
  "Phonk",
  "Chanson",
  "Classical",
  "Folk",
  "Jazz",
  "Ambient",
  "Other",
] as const
export type TrackGenre = (typeof GENRES)[number]

export const TRACK_MOODS = [
  "Спокойное",
  "Грустное",
  "Веселое",
  "Энергичное",
  "Романтичное",
  "Агрессивное",
  "Мотивирующее",
  "Тревожное",
  "Мечтательное",
  "Другое",
] as const
export type TrackMood = (typeof TRACK_MOODS)[number]

/** Для этих вариантов «Права на музыку» обязательно указать ИИ-сервис. */
export function musicRightsRequiresAiService(musicRights: string): boolean {
  return (
    musicRights === "Сгенерирована в ИИ (платно)" ||
    musicRights === "Сгенерирована в ИИ (бесплатно)"
  )
}

/** Заказ ИИ-обложки при загрузке сингла без файла обложки (уведомление модераторам / текст в кабинете). */
export const AI_COVER_REQUEST_PRICE_RUB = 500

/** Подсказка под полем «Текст песни» в кабинете загрузки. */
export const LYRICS_TEXT_UPLOAD_HINT =
  "Текст песни не должен содержать лишнюю информацию и разметку: «Припев», «Мощный дроп с басом», «Бридж», «Затухание» и т. п. При наличии лишнего текста релиз будет отклонён. Соблюдайте правила, чтобы ваш релиз вышел вовремя."

export const STREAMING_SCOPES = ["all", "ru", "foreign"] as const
export type TrackStreamingScope = (typeof STREAMING_SCOPES)[number]
export const DEFAULT_STREAMING_SCOPE: TrackStreamingScope = "all"

export const STREAMING_SCOPE_OPTIONS: {
  value: TrackStreamingScope
  label: string
  shortLabel: string
  hint: string
}[] = [
  {
    value: "all",
    label: "ВСЕ СТРИМИНГ СЕРВИСЫ",
    shortLabel: "Все",
    hint: "Релиз будет отправлен на все доступные стриминг-площадки.",
  },
  {
    value: "ru",
    label: "ТОЛЬКО РОССИЙСКИЕ СТРИМИНГ СЕРВИСЫ",
    shortLabel: "Только РФ",
    hint: "Релиз только на российские площадки (Яндекс Музыка, VK Музыка, Звук и др.).",
  },
  {
    value: "foreign",
    label: "ТОЛЬКО ЗАРУБЕЖНЫЕ СТРИМИНГ СЕРВИСЫ",
    shortLabel: "Только зарубеж",
    hint: "Релиз только на зарубежные площадки (Spotify, Apple Music и др.).",
  },
]

export function normalizeStreamingScope(value: unknown): TrackStreamingScope {
  if (value === "ru" || value === "foreign") return value
  return DEFAULT_STREAMING_SCOPE
}
