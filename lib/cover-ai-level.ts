export const COVER_AI_LEVELS = ["no", "partial", "full"] as const
export type CoverAiLevel = (typeof COVER_AI_LEVELS)[number]

export const COVER_AI_LEVEL_LABELS: Record<CoverAiLevel, string> = {
  no: "Нет",
  partial: "Частично",
  full: "Полностью",
}

export function parseCoverAiLevel(raw: unknown): CoverAiLevel | null {
  if (raw === "no" || raw === "partial" || raw === "full") return raw
  // legacy boolean / "true" | "false"
  if (raw === true || raw === "true") return "full"
  if (raw === false || raw === "false") return "no"
  return null
}

export function isCoverAiLevel(raw: unknown): raw is CoverAiLevel {
  return raw === "no" || raw === "partial" || raw === "full"
}
