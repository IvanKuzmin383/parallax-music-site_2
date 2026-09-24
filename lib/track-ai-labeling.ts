export const AI_LABELING_MODES = ["human", "partial", "full_ai"] as const
export type AiLabelingMode = (typeof AI_LABELING_MODES)[number]

export const AI_BINARY_CHOICES = ["human", "ai"] as const
export type AiBinaryChoice = (typeof AI_BINARY_CHOICES)[number]

export const AI_TERNARY_CHOICES = ["human", "human_ai", "ai"] as const
export type AiTernaryChoice = (typeof AI_TERNARY_CHOICES)[number]

export type TrackAiLabelingDetails = {
  musicAuthorship: AiBinaryChoice | ""
  lyricsAuthorship: AiBinaryChoice | ""
  performance: AiTernaryChoice | ""
  vocals: AiTernaryChoice | ""
  processing: AiTernaryChoice | ""
}

export type TrackAiLabeling = {
  mode: AiLabelingMode
  details?: TrackAiLabelingDetails | null
}

export const AI_LABELING_MODE_OPTIONS: {
  value: AiLabelingMode
  label: string
  description: string
}[] = [
  {
    value: "human",
    label: "Без ИИ, творчество человека",
    description: "ИИ не использовался при создании или обработке трека.",
  },
  {
    value: "partial",
    label: "Частично — ИИ + человек",
    description: "По подробным этапам вклад ИИ есть, но не превышает половину.",
  },
  {
    value: "full_ai",
    label: "Трек полностью создан ИИ (Текст + Музыка + Вокал)",
    description: "Текст, музыка и вокал созданы с помощью ИИ.",
  },
]

export const AI_LABELING_DETAIL_BINARY_LABELS: Record<AiBinaryChoice, string> = {
  human: "Человек",
  ai: "ИИ",
}

export const AI_LABELING_DETAIL_TERNARY_LABELS: Record<AiTernaryChoice, string> = {
  human: "Человек",
  human_ai: "Человек + ИИ",
  ai: "ИИ",
}

export const AI_LABELING_COMPOSITION_FIELDS = [
  { key: "musicAuthorship", label: "Авторство музыки («ноты»)" },
  { key: "lyricsAuthorship", label: "Авторство слов" },
] as const satisfies ReadonlyArray<{ key: keyof TrackAiLabelingDetails; label: string }>

export const AI_LABELING_RECORDING_FIELDS = [
  { key: "performance", label: "Исполнение (кто играет на инструментах)" },
  { key: "vocals", label: "Вокал" },
  { key: "processing", label: "Обработка записи" },
] as const satisfies ReadonlyArray<{ key: keyof TrackAiLabelingDetails; label: string }>

export function emptyAiLabelingDetails(): TrackAiLabelingDetails {
  return {
    musicAuthorship: "",
    lyricsAuthorship: "",
    performance: "",
    vocals: "",
    processing: "",
  }
}

export function parseTrackAiLabeling(raw: unknown): TrackAiLabeling | null {
  if (!raw || typeof raw !== "object") return null
  const obj = raw as Record<string, unknown>
  const mode = obj.mode
  if (mode !== "human" && mode !== "partial" && mode !== "full_ai") return null

  if (mode !== "partial") {
    return { mode, details: null }
  }

  const d = obj.details
  if (!d || typeof d !== "object") {
    return { mode, details: emptyAiLabelingDetails() }
  }
  const details = d as Record<string, unknown>
  const isBinary = (v: unknown): v is AiBinaryChoice => v === "human" || v === "ai"
  const isTernary = (v: unknown): v is AiTernaryChoice =>
    v === "human" || v === "human_ai" || v === "ai"

  return {
    mode,
    details: {
      musicAuthorship: isBinary(details.musicAuthorship) ? details.musicAuthorship : "",
      lyricsAuthorship: isBinary(details.lyricsAuthorship) ? details.lyricsAuthorship : "",
      performance: isTernary(details.performance) ? details.performance : "",
      vocals: isTernary(details.vocals) ? details.vocals : "",
      processing: isTernary(details.processing) ? details.processing : "",
    },
  }
}

export function validateTrackAiLabeling(labeling: TrackAiLabeling | null | undefined): string | null {
  if (!labeling?.mode) {
    return "Выберите вариант AI-маркировки"
  }
  if (!AI_LABELING_MODES.includes(labeling.mode)) {
    return "Выберите вариант AI-маркировки"
  }
  if (labeling.mode === "partial") {
    const d = labeling.details
    if (!d) return "Заполните подробную AI-маркировку"
    for (const field of AI_LABELING_COMPOSITION_FIELDS) {
      if (!AI_BINARY_CHOICES.includes(d[field.key] as AiBinaryChoice)) {
        return `Укажите «${field.label}»`
      }
    }
    for (const field of AI_LABELING_RECORDING_FIELDS) {
      if (!AI_TERNARY_CHOICES.includes(d[field.key] as AiTernaryChoice)) {
        return `Укажите «${field.label}»`
      }
    }
  }
  return null
}

export function aiLabelingModeLabel(mode: AiLabelingMode | null | undefined): string {
  if (!mode) return "Не указано"
  return AI_LABELING_MODE_OPTIONS.find((o) => o.value === mode)?.label ?? mode
}
