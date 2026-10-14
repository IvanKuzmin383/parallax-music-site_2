/**
 * Конфигурация AI-студии генерации музыки.
 * Цены пакетов и ключ провайдера не зашиты: без утверждённых значений запуск недоступен.
 */

export const AI_TRACKS_PROVIDER_ID = "unavailable" as const

/** Внутренний id модели для первой версии (когда провайдер будет включён). */
export const AI_TRACKS_MODEL_ID = "default" as const

/** Показное имя модели пользователю (без агрегаторов и ключей). */
export const AI_TRACKS_MODEL_LABEL = "Parallax Studio" as const

/** Стоимость обычного запуска в попытках. */
export const AI_TRACKS_COST_ATTEMPTS = 1

export type AiTracksMoodId =
  | "atmospheric"
  | "energetic"
  | "romantic"
  | "melancholic"
  | "calm"

export type AiTracksVocalId = "auto" | "female" | "male"

export type AiTracksDirectionId = "pop" | "rap" | "electronic" | "rock" | "lofi"

export type AiTracksMode = "simple" | "advanced"

export const AI_TRACKS_MOODS: Array<{ id: AiTracksMoodId; label: string; promptHint: string }> = [
  { id: "atmospheric", label: "Атмосферное", promptHint: "атмосферное настроение" },
  { id: "energetic", label: "Энергичное", promptHint: "энергичное настроение" },
  { id: "romantic", label: "Романтичное", promptHint: "романтичное настроение" },
  { id: "melancholic", label: "Меланхоличное", promptHint: "меланхоличное настроение" },
  { id: "calm", label: "Спокойное", promptHint: "спокойное настроение" },
]

export const AI_TRACKS_VOCALS: Array<{ id: AiTracksVocalId; label: string; promptHint: string }> = [
  { id: "auto", label: "На выбор модели", promptHint: "" },
  { id: "female", label: "Женский", promptHint: "женский вокал" },
  { id: "male", label: "Мужской", promptHint: "мужской вокал" },
]

export const AI_TRACKS_DIRECTIONS: Array<{
  id: AiTracksDirectionId
  label: string
  promptHint: string
}> = [
  { id: "pop", label: "Поп", promptHint: "поп" },
  { id: "rap", label: "Рэп", promptHint: "рэп" },
  { id: "electronic", label: "Электроника", promptHint: "электроника" },
  { id: "rock", label: "Рок", promptHint: "рок" },
  { id: "lofi", label: "Lo-fi", promptHint: "lo-fi" },
]

/** Лимиты полей (ориентир макета; при подключении модели сверить с контрактом). */
export const AI_TRACKS_LIMITS = {
  ideaMax: 1000,
  titleMax: 80,
  lyricsMax: 5000,
  styleMax: 1000,
} as const

export type AiTracksCapabilityFlags = {
  weirdness: boolean
  styleWeight: boolean
  expectedVariants: number
}

export const AI_TRACKS_CAPABILITIES: AiTracksCapabilityFlags = {
  /** Пока провайдер не подключён - ползунки неактивны в UI через generationEnabled. */
  weirdness: false,
  styleWeight: false,
  expectedVariants: 2,
}

export type AiTracksPack = {
  id: string
  attempts: number
  priceRub: number
  currency: "RUB"
  available: boolean
  label: string
}

/**
 * Розничные пакеты Parallax. Пусто, пока цены не утверждены.
 * Не заполнять выдуманными числами.
 */
export const AI_TRACKS_PACKS: AiTracksPack[] = []

export type AiTracksPublicConfig = {
  generationEnabled: boolean
  unavailableReason: string | null
  providerConfigured: boolean
  modelId: string
  modelLabel: string
  costAttempts: number
  limits: typeof AI_TRACKS_LIMITS
  capabilities: AiTracksCapabilityFlags
  packs: AiTracksPack[]
  packsAvailable: boolean
  commercialRightsNote: string
}
