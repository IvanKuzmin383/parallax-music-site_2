import { AI_TRACKS_MODEL_ID, AI_TRACKS_PROVIDER_ID } from "@/lib/ai-tracks-config"
import {
  getAiTracksPublicConfig,
  isAiTracksProviderConfigured,
} from "@/lib/ai-tracks-config-server"
import type { AiTracksSettingsSnapshot } from "@/lib/ai-tracks-types"

export type AiTracksProviderCreateInput = {
  jobId: string
  settings: AiTracksSettingsSnapshot
  prompt: string
  lyrics: string | null
  title: string | null
  instrumental: boolean
}

export type AiTracksProviderCreateResult =
  | { ok: true; externalTaskId: string }
  | { ok: false; code: "unavailable" | "rejected"; message: string }

export type AiTracksProviderStatus =
  | { status: "pending" }
  | { status: "running" }
  | {
      status: "succeeded"
      variants: Array<{
        index: number
        title: string
        audioUrl: string
        durationSec?: number
        coverUrl?: string
        format?: string
      }>
    }
  | { status: "failed"; message: string }

export interface AiTracksProviderAdapter {
  readonly id: string
  readonly modelId: string
  createTask: (input: AiTracksProviderCreateInput) => Promise<AiTracksProviderCreateResult>
  getStatus: (externalTaskId: string) => Promise<AiTracksProviderStatus>
}

/** Заглушка до подключения реального провайдера. Не имитирует успех. */
export class UnavailableAiTracksProvider implements AiTracksProviderAdapter {
  readonly id = AI_TRACKS_PROVIDER_ID
  readonly modelId = AI_TRACKS_MODEL_ID

  async createTask(): Promise<AiTracksProviderCreateResult> {
    const cfg = getAiTracksPublicConfig()
    return {
      ok: false,
      code: "unavailable",
      message: cfg.unavailableReason ?? "Генерация временно недоступна. Попробуйте позже.",
    }
  }

  async getStatus(): Promise<AiTracksProviderStatus> {
    return {
      status: "failed",
      message: "Генерация временно недоступна. Попробуйте позже.",
    }
  }
}

export function getAiTracksProvider(): AiTracksProviderAdapter {
  // Когда появится ключ и адаптер (например Kie.ai) - выбирать здесь по конфигу.
  if (!isAiTracksProviderConfigured()) {
    return new UnavailableAiTracksProvider()
  }
  return new UnavailableAiTracksProvider()
}
