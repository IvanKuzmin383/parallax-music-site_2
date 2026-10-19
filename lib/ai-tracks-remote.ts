/**
 * Серверный клиент внешнего API генерации музыки.
 * Не импортировать из клиентских компонентов.
 */

import { getAiTracksApiKey } from "@/lib/ai-tracks-config-server"
import type { AiTracksModelId } from "@/lib/ai-tracks-config"

const REMOTE_BASE = "https://api.kie.ai"

export type RemoteGenerateBody = {
  prompt?: string
  lyrics?: string
  style?: string
  title?: string
  customMode: boolean
  instrumental: boolean
  model: AiTracksModelId
  callBackUrl: string
  vocalGender?: "m" | "f"
  styleWeight?: number
  weirdnessConstraint?: number
}

export type RemoteTrackVariant = {
  id: string
  title: string
  audioUrl: string
  coverUrl?: string
  durationSec?: number
}

type RemoteJson = {
  code?: number
  msg?: string
  data?: unknown
}

function authHeaders(): HeadersInit {
  const key = getAiTracksApiKey()
  if (!key) throw new Error("AI_TRACKS_API_KEY missing")
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  }
}

export async function remoteCreateGenerateTask(
  body: RemoteGenerateBody
): Promise<{ ok: true; taskId: string } | { ok: false; message: string; code?: number }> {
  try {
    const res = await fetch(`${REMOTE_BASE}/api/v1/generate`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    })
    const json = (await res.json().catch(() => ({}))) as RemoteJson
    if (json.code !== 200) {
      return {
        ok: false,
        message: sanitizeRemoteMessage(json.msg) || "Не удалось запустить генерацию",
        code: typeof json.code === "number" ? json.code : res.status,
      }
    }
    const data = json.data && typeof json.data === "object" ? (json.data as { taskId?: string }) : null
    const taskId = data?.taskId?.trim()
    if (!taskId) {
      return { ok: false, message: "Сервис не вернул идентификатор задачи" }
    }
    return { ok: true, taskId }
  } catch (e) {
    console.error("[ai-tracks-remote] create failed")
    return { ok: false, message: "Сервис генерации временно недоступен" }
  }
}

export async function remoteGetGenerateDetails(taskId: string): Promise<
  | { ok: true; status: string; variants: RemoteTrackVariant[]; errorMessage: string | null }
  | { ok: false; message: string }
> {
  try {
    const url = new URL(`${REMOTE_BASE}/api/v1/generate/record-info`)
    url.searchParams.set("taskId", taskId)
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: authHeaders(),
      cache: "no-store",
    })
    const json = (await res.json().catch(() => ({}))) as RemoteJson
    if (json.code !== 200) {
      return {
        ok: false,
        message: sanitizeRemoteMessage(json.msg) || "Не удалось получить статус генерации",
      }
    }
    const data =
      json.data && typeof json.data === "object"
        ? (json.data as {
            status?: string
            errorMessage?: string | null
            response?: { sunoData?: unknown }
          })
        : null
    const status = String(data?.status || "PENDING")
    const variants = parseSunoData(data?.response?.sunoData)
    return {
      ok: true,
      status,
      variants,
      errorMessage: data?.errorMessage ? sanitizeRemoteMessage(String(data.errorMessage)) : null,
    }
  } catch {
    console.error("[ai-tracks-remote] details failed")
    return { ok: false, message: "Не удалось получить статус генерации" }
  }
}

function parseSunoData(raw: unknown): RemoteTrackVariant[] {
  if (!Array.isArray(raw)) return []
  const out: RemoteTrackVariant[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    const audioUrl =
      (typeof row.audio_url === "string" && row.audio_url) ||
      (typeof row.source_audio_url === "string" && row.source_audio_url) ||
      ""
    if (!audioUrl) continue
    out.push({
      id: typeof row.id === "string" ? row.id : crypto.randomUUID(),
      title: typeof row.title === "string" && row.title.trim() ? row.title.trim() : "Без названия",
      audioUrl,
      coverUrl:
        (typeof row.image_url === "string" && row.image_url) ||
        (typeof row.source_image_url === "string" && row.source_image_url) ||
        undefined,
      durationSec: typeof row.duration === "number" ? row.duration : undefined,
    })
  }
  return out
}

/** Убирает из сообщений имена внешних сервисов. */
export function sanitizeRemoteMessage(msg: string | undefined | null): string {
  if (!msg) return ""
  let s = String(msg)
  s = s.replace(/kie\.ai/gi, "сервис")
  s = s.replace(/\bkie\b/gi, "сервис")
  s = s.replace(/\bsuno\b/gi, "модель")
  return s.trim()
}

export function isRemoteTerminalSuccess(status: string): boolean {
  return status === "SUCCESS"
}

export function isRemoteTerminalFailure(status: string): boolean {
  return (
    status === "CREATE_TASK_FAILED" ||
    status === "GENERATE_AUDIO_FAILED" ||
    status === "CALLBACK_EXCEPTION" ||
    status === "SENSITIVE_WORD_ERROR"
  )
}
