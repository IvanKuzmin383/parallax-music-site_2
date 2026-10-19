import {
  AI_TRACKS_CAPABILITIES,
  AI_TRACKS_LIMITS,
  AI_TRACKS_MODEL_ID,
  AI_TRACKS_MODEL_LABEL,
  AI_TRACKS_MODELS,
  AI_TRACKS_PACKS,
  AI_TRACKS_PRICE_RUB,
  type AiTracksPublicConfig,
} from "@/lib/ai-tracks-config"

function envFlagTrue(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

/** Ключ API генерации (не отдавать на клиент). */
export function getAiTracksApiKey(): string | null {
  const key =
    process.env.AI_TRACKS_API_KEY?.trim() || process.env.KIE_API_KEY?.trim() || ""
  return key || null
}

export function getAiTracksCallbackSecret(): string {
  return (
    process.env.AI_TRACKS_CALLBACK_SECRET?.trim() ||
    getAiTracksApiKey() ||
    "ai-tracks-callback"
  )
}

/** Серверная проверка: ключ и явный флаг включения. */
export function isAiTracksProviderConfigured(): boolean {
  return Boolean(getAiTracksApiKey()) && envFlagTrue("AI_TRACKS_GENERATION_ENABLED")
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
    models: AI_TRACKS_MODELS.map((m) => ({ id: m.id, label: m.label, hint: m.hint })),
    priceRub: AI_TRACKS_PRICE_RUB,
    costAttempts: 0,
    limits: AI_TRACKS_LIMITS,
    capabilities: {
      ...AI_TRACKS_CAPABILITIES,
      weirdness: generationEnabled,
      styleWeight: generationEnabled,
    },
    packs,
    packsAvailable: packs.length > 0,
    commercialRightsNote:
      "Возможность коммерческого использования зависит от условий выбранной модели и прав на исходные материалы.",
  }
}
