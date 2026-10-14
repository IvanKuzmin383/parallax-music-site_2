import {
  AI_TRACKS_CAPABILITIES,
  AI_TRACKS_COST_ATTEMPTS,
  AI_TRACKS_LIMITS,
  AI_TRACKS_MODEL_ID,
  AI_TRACKS_MODEL_LABEL,
  AI_TRACKS_PACKS,
  type AiTracksPublicConfig,
} from "@/lib/ai-tracks-config"

function envFlagTrue(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

/** Серверная проверка: ключ и явный флаг включения. */
export function isAiTracksProviderConfigured(): boolean {
  const key = process.env.AI_TRACKS_API_KEY?.trim()
  return Boolean(key) && envFlagTrue("AI_TRACKS_GENERATION_ENABLED")
}

export function getAiTracksPublicConfig(): AiTracksPublicConfig {
  const providerConfigured = isAiTracksProviderConfigured()
  const packs = AI_TRACKS_PACKS.filter((p) => p.available && p.attempts > 0 && p.priceRub > 0)
  const generationEnabled = providerConfigured

  return {
    generationEnabled,
    unavailableReason: generationEnabled
      ? null
      : "Генерация временно недоступна. Попробуйте позже.",
    providerConfigured,
    modelId: AI_TRACKS_MODEL_ID,
    modelLabel: AI_TRACKS_MODEL_LABEL,
    costAttempts: AI_TRACKS_COST_ATTEMPTS,
    limits: AI_TRACKS_LIMITS,
    capabilities: AI_TRACKS_CAPABILITIES,
    packs,
    packsAvailable: packs.length > 0,
    commercialRightsNote:
      "Возможность коммерческого использования зависит от условий выбранной модели и прав на исходные материалы.",
  }
}
