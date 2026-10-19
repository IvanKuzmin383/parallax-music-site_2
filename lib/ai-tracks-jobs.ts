import crypto from "crypto"
import {
  AI_TRACKS_MODEL_ID,
  AI_TRACKS_MODEL_LABEL,
  AI_TRACKS_PRICE_RUB,
  AI_TRACKS_PROVIDER_ID,
  AI_TRACKS_DIRECTIONS,
} from "@/lib/ai-tracks-config"
import { chargeAiTracksGeneration, refundAiTracksGeneration } from "@/lib/ai-tracks-billing"
import { getAiTracksPublicConfig } from "@/lib/ai-tracks-config-server"
import { getAiTracksProvider } from "@/lib/ai-tracks-provider"
import {
  AI_TRACKS_STATUS_MESSAGES,
  type AiTracksJobDto,
  type AiTracksJobStatus,
  type AiTracksResultDto,
  type AiTracksSettingsSnapshot,
} from "@/lib/ai-tracks-types"
import {
  buildPromptParts,
  normalizeAiTracksDraft,
  toSettingsSnapshot,
  validateAiTracksDraft,
} from "@/lib/ai-tracks-validation"
import { getCabinetUserById } from "@/lib/cabinet-users"
import { clientExecute, execute, query, queryOne, withTransaction } from "@/lib/database"

type JobRow = {
  id: string
  user_id: string
  idempotency_key: string
  status: string
  mode: string
  settings_json: string
  provider: string
  model_id: string
  cost_attempts: number
  external_task_id: string | null
  error_code: string | null
  error_message: string | null
  created_at: Date | string
  updated_at: Date | string
  started_at: Date | string | null
  finished_at: Date | string | null
}

type ResultRow = {
  id: string
  job_id: string
  user_id: string
  variant_index: number
  title: string
  duration_sec: number | null
  audio_storage_key: string | null
  cover_storage_key: string | null
  audio_format: string | null
  is_favorite: boolean
  metadata_json: string | null
  created_at: Date | string
}

function iso(v: Date | string | null | undefined): string {
  if (!v) return new Date(0).toISOString()
  if (v instanceof Date) return v.toISOString()
  return new Date(v).toISOString()
}

function parseSettings(raw: string): AiTracksSettingsSnapshot {
  try {
    return toSettingsSnapshot(normalizeAiTracksDraft(JSON.parse(raw)))
  } catch {
    return toSettingsSnapshot(normalizeAiTracksDraft({}))
  }
}

function variantLabel(index: number): string {
  return String.fromCharCode(65 + Math.max(0, index))
}

function directionLabel(settings: AiTracksSettingsSnapshot): string | null {
  if (!settings.direction) return null
  return AI_TRACKS_DIRECTIONS.find((d) => d.id === settings.direction)?.label ?? null
}

async function getWalletBalance(userId: string): Promise<number> {
  const user = await getCabinetUserById(userId)
  return Math.max(0, Number(user?.walletBalance ?? 0) || 0)
}

function mapResult(row: ResultRow, settings: AiTracksSettingsSnapshot): AiTracksResultDto {
  return {
    id: row.id,
    jobId: row.job_id,
    variantIndex: row.variant_index,
    variantLabel: variantLabel(row.variant_index),
    title: row.title || "Без названия",
    durationSec: row.duration_sec == null ? null : Number(row.duration_sec),
    audioUrl: row.audio_storage_key
      ? `/api/cabinet/ai-tracks/results/${encodeURIComponent(row.id)}/audio`
      : null,
    coverUrl: null,
    audioFormat: row.audio_format,
    isFavorite: row.is_favorite === true,
    modelLabel: AI_TRACKS_MODEL_LABEL,
    directionLabel: directionLabel(settings),
    createdAt: iso(row.created_at),
  }
}

function mapJob(row: JobRow, results: ResultRow[]): AiTracksJobDto {
  const settings = parseSettings(row.settings_json)
  const priceRub = Number(row.cost_attempts) || AI_TRACKS_PRICE_RUB
  return {
    id: row.id,
    status: row.status as AiTracksJobStatus,
    mode: settings.mode,
    settings,
    provider: row.provider,
    modelId: row.model_id,
    modelLabel: AI_TRACKS_MODEL_LABEL,
    priceRub,
    /** @deprecated колонка cost_attempts хранит цену в ₽ */
    costAttempts: priceRub,
    errorMessage: row.error_message,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    results: results
      .filter((r) => r.job_id === row.id)
      .sort((a, b) => a.variant_index - b.variant_index)
      .map((r) => mapResult(r, settings)),
  }
}

export async function listAiTracksJobsForUser(params: {
  userId: string
  favoritesOnly?: boolean
  limit?: number
  offset?: number
}): Promise<{ jobs: AiTracksJobDto[]; totalResults: number; favoriteCount: number }> {
  const limit = Math.min(50, Math.max(1, params.limit ?? 20))
  const offset = Math.max(0, params.offset ?? 0)

  const favoriteCountRow = await queryOne<{ c: string | number }>(
    `SELECT COUNT(*)::int AS c FROM ai_tracks_results WHERE user_id = ? AND is_favorite = TRUE`,
    [params.userId]
  )
  const totalResultsRow = await queryOne<{ c: string | number }>(
    `SELECT COUNT(*)::int AS c FROM ai_tracks_results WHERE user_id = ?`,
    [params.userId]
  )

  let jobs: JobRow[]
  if (params.favoritesOnly) {
    jobs = await query<JobRow>(
      `SELECT j.*
       FROM ai_tracks_jobs j
       WHERE j.user_id = ?
         AND EXISTS (
           SELECT 1 FROM ai_tracks_results r
           WHERE r.job_id = j.id AND r.is_favorite = TRUE
         )
       ORDER BY j.created_at DESC
       LIMIT ? OFFSET ?`,
      [params.userId, limit, offset]
    )
  } else {
    jobs = await query<JobRow>(
      `SELECT * FROM ai_tracks_jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [params.userId, limit, offset]
    )
  }

  if (jobs.length === 0) {
    return {
      jobs: [],
      totalResults: Number(totalResultsRow?.c ?? 0) || 0,
      favoriteCount: Number(favoriteCountRow?.c ?? 0) || 0,
    }
  }

  const jobIds = jobs.map((j) => j.id)
  const placeholders = jobIds.map(() => "?").join(", ")
  const results = await query<ResultRow>(
    `SELECT * FROM ai_tracks_results WHERE job_id IN (${placeholders}) ORDER BY variant_index ASC`,
    jobIds
  )

  const mapped = jobs.map((j) => mapJob(j, results))
  if (params.favoritesOnly) {
    for (const job of mapped) {
      job.results = job.results.filter((r) => r.isFavorite)
    }
  }

  return {
    jobs: mapped,
    totalResults: Number(totalResultsRow?.c ?? 0) || 0,
    favoriteCount: Number(favoriteCountRow?.c ?? 0) || 0,
  }
}

export async function getAiTracksJobForUser(
  userId: string,
  jobId: string
): Promise<AiTracksJobDto | null> {
  const row = await queryOne<JobRow>(
    `SELECT * FROM ai_tracks_jobs WHERE id = ? AND user_id = ?`,
    [jobId, userId]
  )
  if (!row) return null
  const results = await query<ResultRow>(
    `SELECT * FROM ai_tracks_results WHERE job_id = ? ORDER BY variant_index ASC`,
    [jobId]
  )
  return mapJob(row, results)
}

export type CreateAiTracksJobResult =
  | { ok: true; job: AiTracksJobDto; walletBalance: number; reused: boolean }
  | {
      ok: false
      error:
        | "validation"
        | "unavailable"
        | "insufficient"
        | "user_not_found"
      message: string
      fieldErrors?: Array<{ field: string; message: string }>
      walletBalance?: number
    }

export async function createAiTracksJob(params: {
  userId: string
  draft: unknown
  idempotencyKey: string
}): Promise<CreateAiTracksJobResult> {
  const cfg = getAiTracksPublicConfig()
  const draft = normalizeAiTracksDraft(params.draft)
  const fieldErrors = validateAiTracksDraft(draft)
  if (fieldErrors.length > 0) {
    return {
      ok: false,
      error: "validation",
      message: fieldErrors[0]?.message ?? "Проверьте поля формы",
      fieldErrors,
    }
  }

  const idempotencyKey = params.idempotencyKey.trim().slice(0, 128)
  if (!idempotencyKey) {
    return { ok: false, error: "validation", message: "Отсутствует ключ идемпотентности" }
  }

  const existing = await queryOne<JobRow>(
    `SELECT * FROM ai_tracks_jobs WHERE user_id = ? AND idempotency_key = ?`,
    [params.userId, idempotencyKey]
  )
  if (existing) {
    const job = await getAiTracksJobForUser(params.userId, existing.id)
    const walletBalance = await getWalletBalance(params.userId)
    if (!job) {
      return { ok: false, error: "user_not_found", message: "Задача не найдена" }
    }
    return { ok: true, job, walletBalance, reused: true }
  }

  if (!cfg.generationEnabled) {
    return {
      ok: false,
      error: "unavailable",
      message: cfg.unavailableReason ?? AI_TRACKS_STATUS_MESSAGES.service_unavailable,
      walletBalance: await getWalletBalance(params.userId),
    }
  }

  const settings = toSettingsSnapshot(draft)
  const priceRub = cfg.priceRub > 0 ? cfg.priceRub : AI_TRACKS_PRICE_RUB
  const jobId = crypto.randomUUID()
  const now = new Date().toISOString()

  try {
    const txResult = await withTransaction(async (client) => {
      try {
        await clientExecute(
          client,
          `INSERT INTO ai_tracks_jobs (
            id, user_id, idempotency_key, status, mode, settings_json,
            provider, model_id, cost_attempts, created_at, updated_at
          ) VALUES (?, ?, ?, 'QUEUED', ?, ?, ?, ?, ?, ?, ?)`,
          [
            jobId,
            params.userId,
            idempotencyKey,
            settings.mode,
            JSON.stringify(settings),
            AI_TRACKS_PROVIDER_ID,
            AI_TRACKS_MODEL_ID,
            priceRub,
            now,
            now,
          ]
        )
      } catch (e: unknown) {
        const code =
          e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : ""
        if (code === "23505") {
          return { kind: "duplicate" as const }
        }
        throw e
      }
      return { kind: "created" as const }
    })

    if (txResult.kind === "duplicate") {
      const again = await queryOne<JobRow>(
        `SELECT * FROM ai_tracks_jobs WHERE user_id = ? AND idempotency_key = ?`,
        [params.userId, idempotencyKey]
      )
      if (again) {
        const job = await getAiTracksJobForUser(params.userId, again.id)
        const walletBalance = await getWalletBalance(params.userId)
        if (job) return { ok: true, job, walletBalance, reused: true }
      }
      return { ok: false, error: "user_not_found", message: "Задача не найдена" }
    }
  } catch (e) {
    throw e
  }

  const charged = await chargeAiTracksGeneration({
    userId: params.userId,
    jobId,
    priceRub,
  })

  if (!charged.ok) {
    await execute(`DELETE FROM ai_tracks_jobs WHERE id = ? AND user_id = ?`, [
      jobId,
      params.userId,
    ])
    if (charged.status === 404) {
      return {
        ok: false,
        error: "user_not_found",
        message: charged.error,
        walletBalance: 0,
      }
    }
    const walletBalance = await getWalletBalance(params.userId)
    if (charged.status === 400) {
      return {
        ok: false,
        error: "insufficient",
        message: AI_TRACKS_STATUS_MESSAGES.insufficient_balance,
        walletBalance,
      }
    }
    return {
      ok: false,
      error: "unavailable",
      message: charged.error || AI_TRACKS_STATUS_MESSAGES.service_unavailable,
      walletBalance,
    }
  }

  const provider = getAiTracksProvider()
  const parts = buildPromptParts(draft)
  const created = await provider.createTask({
    jobId,
    settings,
    prompt: parts.prompt,
    lyrics: parts.lyrics,
    title: parts.title,
    instrumental: parts.instrumental,
  })

  if (!created.ok) {
    await execute(
      `UPDATE ai_tracks_jobs
       SET status = 'FAILED', error_code = ?, error_message = ?, updated_at = NOW(), finished_at = NOW()
       WHERE id = ?`,
      [created.code, created.message, jobId]
    )
    await refundAiTracksGeneration({
      userId: params.userId,
      jobId,
      priceRub,
    })
    return {
      ok: false,
      error: "unavailable",
      message: created.message,
      walletBalance: await getWalletBalance(params.userId),
    }
  }

  await execute(
    `UPDATE ai_tracks_jobs
     SET status = 'RUNNING', external_task_id = ?, started_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [created.externalTaskId, jobId]
  )

  const job = await getAiTracksJobForUser(params.userId, jobId)
  if (!job) {
    return {
      ok: false,
      error: "user_not_found",
      message: "Задача не найдена",
      walletBalance: charged.walletBalance,
    }
  }
  return { ok: true, job, walletBalance: charged.walletBalance, reused: false }
}

/** Завершить job успехом (для будущего воркера). Списание уже сделано при создании. */
export async function markAiTracksJobSucceeded(params: {
  userId: string
  jobId: string
}): Promise<void> {
  await execute(
    `UPDATE ai_tracks_jobs
     SET status = 'SUCCEEDED', updated_at = NOW(), finished_at = NOW()
     WHERE id = ? AND user_id = ?`,
    [params.jobId, params.userId]
  )
}

export async function setAiTracksResultFavorite(params: {
  userId: string
  resultId: string
  favorite: boolean
}): Promise<AiTracksResultDto | null> {
  const updated = await execute(
    `UPDATE ai_tracks_results SET is_favorite = ?
     WHERE id = ? AND user_id = ?`,
    [params.favorite, params.resultId, params.userId]
  )
  if (!updated) return null

  const row = await queryOne<ResultRow>(
    `SELECT * FROM ai_tracks_results WHERE id = ? AND user_id = ?`,
    [params.resultId, params.userId]
  )
  if (!row) return null
  const job = await queryOne<JobRow>(`SELECT * FROM ai_tracks_jobs WHERE id = ?`, [row.job_id])
  const settings = job ? parseSettings(job.settings_json) : toSettingsSnapshot(normalizeAiTracksDraft({}))
  return mapResult(row, settings)
}

export async function getAiTracksResultAudioForUser(params: {
  userId: string
  resultId: string
}): Promise<{ storageKey: string; format: string | null; title: string } | null> {
  const row = await queryOne<ResultRow>(
    `SELECT * FROM ai_tracks_results WHERE id = ? AND user_id = ?`,
    [params.resultId, params.userId]
  )
  if (!row?.audio_storage_key) return null
  return {
    storageKey: row.audio_storage_key,
    format: row.audio_format,
    title: row.title || "track",
  }
}

export async function getAiTracksResultBundleForUser(params: {
  userId: string
  resultId: string
}): Promise<{
  result: AiTracksResultDto
  settings: AiTracksSettingsSnapshot
  storageKey: string | null
  format: string | null
} | null> {
  const row = await queryOne<ResultRow>(
    `SELECT * FROM ai_tracks_results WHERE id = ? AND user_id = ?`,
    [params.resultId, params.userId]
  )
  if (!row) return null
  const job = await queryOne<JobRow>(`SELECT * FROM ai_tracks_jobs WHERE id = ?`, [row.job_id])
  const settings = job ? parseSettings(job.settings_json) : toSettingsSnapshot(normalizeAiTracksDraft({}))
  return {
    result: mapResult(row, settings),
    settings,
    storageKey: row.audio_storage_key,
    format: row.audio_format,
  }
}

/** Активные задачи пользователя (для восстановления UI после reload). */
export async function listActiveAiTracksJobs(userId: string): Promise<AiTracksJobDto[]> {
  const rows = await query<JobRow>(
    `SELECT * FROM ai_tracks_jobs
     WHERE user_id = ?
       AND status IN ('QUEUED', 'RUNNING', 'RECONCILING', 'TRANSFERRING')
     ORDER BY created_at DESC
     LIMIT 10`,
    [userId]
  )
  if (!rows.length) return []
  const ids = rows.map((r) => r.id)
  const placeholders = ids.map(() => "?").join(", ")
  const results = await query<ResultRow>(
    `SELECT * FROM ai_tracks_results WHERE job_id IN (${placeholders})`,
    ids
  )
  return rows.map((r) => mapJob(r, results))
}
