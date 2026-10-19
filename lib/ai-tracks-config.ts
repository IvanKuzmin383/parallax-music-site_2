/**
 * Конфигурация AI-студии генерации музыки.
 * Публичные строки без упоминания внешних провайдеров.
 */

export const AI_TRACKS_PROVIDER_ID = "parallax_studio" as const

/** Модель по умолчанию (внутренний id для API). */
export const AI_TRACKS_MODEL_ID = "V6" as const

/** Показное имя студии пользователю. */
export const AI_TRACKS_MODEL_LABEL = "Parallax Studio" as const

/** Стоимость одной генерации с баланса кабинета, ₽. */
export const AI_TRACKS_PRICE_RUB = 30

/** @deprecated Используйте AI_TRACKS_PRICE_RUB - попытки убраны. */
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

/** Внутренние id моделей генерации. */
export type AiTracksModelId = "V6" | "V6_MINI" | "V6_WILD"

export const AI_TRACKS_MODELS: Array<{
  id: AiTracksModelId
  label: string
  hint: string
}> = [
  { id: "V6", label: "v6", hint: "Более выразительный вокал и детали" },
  { id: "V6_MINI", label: "v6 Mini", hint: "Быстрее, баланс качества и скорости" },
  { id: "V6_WILD", label: "v6 Wild", hint: "Смелее и необычнее" },
]

export function isAiTracksModelId(v: unknown): v is AiTracksModelId {
  return v === "V6" || v === "V6_MINI" || v === "V6_WILD"
}

export function aiTracksModelLabel(id: string): string {
  return AI_TRACKS_MODELS.find((m) => m.id === id)?.label ?? AI_TRACKS_MODEL_LABEL
}

export const AI_TRACKS_MOODS: Array<{ id: AiTracksMoodId; label: string; promptHint: string }> = [
  { id: "atmospheric", label: "Атмосферное", promptHint: "атмосферное настроение" },
  { id: "energetic", label: "Энергичное", promptHint: "энергичное настроение" },
  { id: "romantic", label: "Романтичное", promptHint: "романтичное настроение" },
  { id: "melancholic", label: "Меланхоличное", promptHint: "меланхоличное настроение" },
  { id: "calm", label: "Спокойное", promptHint: "спокойное настроение" },
]

/**
 * Меняет подсказку чипа в видимом тексте (стиль / идея):
 * убирает старые hint из группы и при необходимости добавляет новый.
 */
export function rewriteAiTracksChipHint(
  text: string,
  group: ReadonlyArray<{ promptHint: string }>,
  nextHint: string | null | undefined,
  maxLen: number,
): string {
  let next = text
  for (const item of group) {
    const hint = item.promptHint?.trim()
    if (!hint) continue
    const escaped = hint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    next = next
      .replace(new RegExp(`(^|[.,;!?\\s]+)${escaped}(?=$|[.,;!?\\s])`, "gi"), "$1")
      .replace(/\s{2,}/g, " ")
      .replace(/\s*([.,;!?])\s*/g, "$1 ")
      .replace(/^[.,;!\s]+|[.,;!\s]+$/g, "")
      .trim()
  }
  const add = nextHint?.trim()
  if (add) {
    const already = next.toLowerCase().includes(add.toLowerCase())
    if (!already) next = next ? `${next}. ${add}` : add
  }
  if (next.length > maxLen) next = next.slice(0, maxLen)
  return next
}

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

/** Лимиты полей (согласованы с контрактом генерации). */
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
  weirdness: true,
  styleWeight: true,
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

/** Розничные пакеты попыток не используются - оплата с баланса. */
export const AI_TRACKS_PACKS: AiTracksPack[] = []

export type AiTracksPublicModel = {
  id: AiTracksModelId
  label: string
  hint: string
}

export type AiTracksPublicConfig = {
  generationEnabled: boolean
  unavailableReason: string | null
  providerConfigured: boolean
  modelId: string
  modelLabel: string
  models: AiTracksPublicModel[]
  /** Цена одной генерации с баланса, ₽. */
  priceRub: number
  /** @deprecated Совместимость; всегда 0 - попытки убраны. */
  costAttempts: number
  limits: typeof AI_TRACKS_LIMITS
  capabilities: AiTracksCapabilityFlags
  packs: AiTracksPack[]
  packsAvailable: boolean
  commercialRightsNote: string
}
