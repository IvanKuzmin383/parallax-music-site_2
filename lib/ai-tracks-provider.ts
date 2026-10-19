import {
  AI_TRACKS_MODEL_ID,
  AI_TRACKS_PROVIDER_ID,
  AI_TRACKS_DIRECTIONS,
  AI_TRACKS_MOODS,
  isAiTracksModelId,
  type AiTracksModelId,
} from "@/lib/ai-tracks-config"
import {
  getAiTracksCallbackSecret,
  getAiTracksPublicConfig,
  isAiTracksProviderConfigured,
} from "@/lib/ai-tracks-config-server"
import {
  isRemoteTerminalFailure,
  isRemoteTerminalSuccess,
  remoteCreateGenerateTask,
  remoteGetGenerateDetails,
  sanitizeRemoteMessage,
  type RemoteGenerateBody,
} from "@/lib/ai-tracks-remote"
import type { AiTracksSettingsSnapshot } from "@/lib/ai-tracks-types"
import { getSiteBaseUrl } from "@/lib/tbank-cabinet-payment"

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
        externalId?: string
      }>
    }
  | { status: "failed"; message: string }

export interface AiTracksProviderAdapter {
  readonly id: string
  readonly modelId: string
  createTask: (input: AiTracksProviderCreateInput) => Promise<AiTracksProviderCreateResult>
  getStatus: (externalTaskId: string) => Promise<AiTracksProviderStatus>
}

/** Заглушка, когда генерация выключена. */
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

function buildStyleHints(settings: AiTracksSettingsSnapshot): string {
  const parts: string[] = []
  if (settings.direction) {
    const d = AI_TRACKS_DIRECTIONS.find((x) => x.id === settings.direction)
    if (d?.promptHint) parts.push(d.promptHint)
  }
  if (settings.mood) {
    const m = AI_TRACKS_MOODS.find((x) => x.id === settings.mood)
    if (m?.promptHint) parts.push(m.promptHint)
  }
  return parts.join(", ")
}

function resolveModel(settings: AiTracksSettingsSnapshot): AiTracksModelId {
  return isAiTracksModelId(settings.modelId) ? settings.modelId : AI_TRACKS_MODEL_ID
}

function buildCallbackUrl(): string {
  const base = getSiteBaseUrl()
  const t = getAiTracksCallbackSecret()
  return `${base}/api/webhooks/ai-tracks/callback?t=${encodeURIComponent(t)}`
}

function pctToUnit(pct: number): number {
  const n = Math.round((Math.min(100, Math.max(0, pct)) / 100) * 100) / 100
  return n
}

export function buildRemoteGenerateBody(
  input: AiTracksProviderCreateInput
): RemoteGenerateBody {
  const { settings } = input
  const model = resolveModel(settings)
  const callBackUrl = buildCallbackUrl()
  const hints = buildStyleHints(settings)

  if (settings.mode === "simple") {
    const style = hints || "pop"
    const prompt = input.prompt.trim()
    return {
      customMode: false,
      instrumental: input.instrumental,
      model,
      callBackUrl,
      prompt,
      style,
    }
  }

  const body: RemoteGenerateBody = {
    customMode: true,
    instrumental: input.instrumental,
    model,
    callBackUrl,
    style: (settings.style.trim() || hints || "pop").slice(0, 1000),
  }

  if (input.title?.trim()) body.title = input.title.trim().slice(0, 80)

  if (!input.instrumental) {
    const lyrics = (input.lyrics || "").trim()
    if (lyrics) body.lyrics = lyrics.slice(0, 5000)
    if (settings.vocal === "female") body.vocalGender = "f"
    if (settings.vocal === "male") body.vocalGender = "m"
  }

  body.styleWeight = pctToUnit(settings.styleWeightPct)
  body.weirdnessConstraint = pctToUnit(settings.weirdnessPct)

  return body
}

export class RemoteAiTracksProvider implements AiTracksProviderAdapter {
  readonly id = AI_TRACKS_PROVIDER_ID
  readonly modelId = AI_TRACKS_MODEL_ID

  async createTask(input: AiTracksProviderCreateInput): Promise<AiTracksProviderCreateResult> {
    const body = buildRemoteGenerateBody(input)
    const created = await remoteCreateGenerateTask(body)
    if (!created.ok) {
      return {
        ok: false,
        code: created.code === 402 || created.code === 429 ? "rejected" : "unavailable",
        message: created.message,
      }
    }
    return { ok: true, externalTaskId: created.taskId }
  }

  async getStatus(externalTaskId: string): Promise<AiTracksProviderStatus> {
    const details = await remoteGetGenerateDetails(externalTaskId)
    if (!details.ok) {
      return { status: "running" }
    }
    if (isRemoteTerminalSuccess(details.status) && details.variants.length > 0) {
      return {
        status: "succeeded",
        variants: details.variants.map((v, index) => ({
          index,
          title: v.title,
          audioUrl: v.audioUrl,
          coverUrl: v.coverUrl,
          durationSec: v.durationSec,
          format: "mp3",
          externalId: v.id,
        })),
      }
    }
    if (isRemoteTerminalFailure(details.status)) {
      return {
        status: "failed",
        message:
          details.errorMessage ||
          sanitizeRemoteMessage("Не удалось завершить генерацию") ||
          "Не удалось завершить генерацию",
      }
    }
    if (details.status === "PENDING" || details.status === "TEXT_SUCCESS") {
      return { status: "pending" }
    }
    return { status: "running" }
  }
}

export function getAiTracksProvider(): AiTracksProviderAdapter {
  if (!isAiTracksProviderConfigured()) {
    return new UnavailableAiTracksProvider()
  }
  return new RemoteAiTracksProvider()
}
