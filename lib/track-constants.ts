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
