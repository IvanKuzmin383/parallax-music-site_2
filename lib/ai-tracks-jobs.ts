import crypto from "crypto"
import {
  AI_TRACKS_COST_ATTEMPTS,
  AI_TRACKS_DIRECTIONS,
  AI_TRACKS_MODEL_ID,
  AI_TRACKS_MODEL_LABEL,
  AI_TRACKS_PROVIDER_ID,
} from "@/lib/ai-tracks-config"
import { getAiTracksPublicConfig } from "@/lib/ai-tracks-config-server"
import {
  getAiTracksAttempts,
  runCommitAttempt,
  runRefundAttempt,
  runReserveAttempt,
  type AttemptLedgerStore,
} from "@/lib/ai-tracks-attempts"
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
import {
  clientExecute,
  clientQuery,
  execute,
  query,
  queryOne,
  withTransaction,
} from "@/lib/database"
import type { PoolClient } from "pg"

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
  return {
    id: row.id,
    status: row.status as AiTracksJobStatus,
    mode: settings.mode,
    settings,
    provider: row.provider,
    modelId: row.model_id,
    modelLabel: AI_TRACKS_MODEL_LABEL,
    costAttempts: Number(row.cost_attempts) || AI_TRACKS_COST_ATTEMPTS,
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
  | { ok: true; job: AiTracksJobDto; attempts: number; reused: boolean }
  | {
      ok: false
      error:
        | "validation"
        | "unavailable"
        | "insufficient"
        | "user_not_found"
      message: string
      fieldErrors?: Array<{ field: string; message: string }>
      attempts?: number
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
    const attempts = await getAiTracksAttempts(params.userId)
    if (!job) {
      return { ok: false, error: "user_not_found", message: "Задача не найдена" }
    }
    return { ok: true, job, attempts, reused: true }
  }

  if (!cfg.generationEnabled) {
    return {
      ok: false,
      error: "unavailable",
      message: cfg.unavailableReason ?? AI_TRACKS_STATUS_MESSAGES.service_unavailable,
      attempts: await getAiTracksAttempts(params.userId),
    }
  }

  const settings = toSettingsSnapshot(draft)
  const cost = cfg.costAttempts
  const jobId = crypto.randomUUID()
  const now = new Date().toISOString()

  let reservedAttempts = 0
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
            cost,
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

      const reserved = await runReserveAttempt(pgAttemptStore(client), params.userId, jobId, cost)
      if (!reserved.ok) {
        throw Object.assign(new Error(reserved.error), { reserveError: reserved })
      }
      return { kind: "created" as const, attempts: reserved.attempts }
    })

    if (txResult.kind === "duplicate") {
      const again = await queryOne<JobRow>(
        `SELECT * FROM ai_tracks_jobs WHERE user_id = ? AND idempotency_key = ?`,
        [params.userId, idempotencyKey]
      )
      if (again) {
        const job = await getAiTracksJobForUser(params.userId, again.id)
        const attempts = await getAiTracksAttempts(params.userId)
        if (job) return { ok: true, job, attempts, reused: true }
      }
      return { ok: false, error: "user_not_found", message: "Задача не найдена" }
    }
    reservedAttempts = txResult.attempts
  } catch (e: unknown) {
    const reserveError =
      e && typeof e === "object" && "reserveError" in e
        ? (e as { reserveError: { error: string; attempts: number } }).reserveError
        : null
    if (reserveError?.error === "insufficient") {
      return {
        ok: false,
        error: "insufficient",
        message: AI_TRACKS_STATUS_MESSAGES.no_attempts,
        attempts: reserveError.attempts,
      }
    }
    if (reserveError?.error === "user_not_found") {
      return { ok: false, error: "user_not_found", message: "Пользователь не найден", attempts: 0 }
    }
    throw e
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
    await withTransaction(async (client) => {
      await clientExecute(
        client,
        `UPDATE ai_tracks_jobs
         SET status = 'FAILED', error_code = ?, error_message = ?, updated_at = NOW(), finished_at = NOW()
         WHERE id = ?`,
        [created.code, created.message, jobId]
      )
      await runRefundAttempt(pgAttemptStore(client), params.userId, jobId)
    })
    const attempts = await getAiTracksAttempts(params.userId)
    return {
      ok: false,
      error: "unavailable",
      message: created.message,
      attempts,
    }
  }

  await execute(
    `UPDATE ai_tracks_jobs
     SET status = 'RUNNING', external_task_id = ?, started_at = NOW(), updated_at = NOW()
     WHERE id = ?`,
    [created.externalTaskId, jobId]
  )

  const job = await getAiTracksJobForUser(params.userId, jobId)
  const attempts = await getAiTracksAttempts(params.userId)
  if (!job) {
    return {
      ok: false,
      error: "user_not_found",
      message: "Задача не найдена",
      attempts: attempts || reservedAttempts,
    }
  }
  return { ok: true, job, attempts, reused: false }
}

function pgAttemptStore(client: PoolClient): AttemptLedgerStore {
  return {
    async getBalanceForUpdate(userId) {
      const rows = await clientQuery<{ ai_tracks_attempts: number | null }>(
        client,
        `SELECT ai_tracks_attempts FROM cabinet_users WHERE id = ? FOR UPDATE`,
        [userId]
      )
      const row = rows[0]
      if (!row) return null
      return Math.max(0, Number(row.ai_tracks_attempts ?? 0) || 0)
    },
    async setBalance(userId, attempts) {
      await clientExecute(client, `UPDATE cabinet_users SET ai_tracks_attempts = ? WHERE id = ?`, [
        Math.max(0, attempts),
        userId,
      ])
    },
    async findOp(jobId, kind) {
      const rows = await clientQuery<{ id: string; amount: number }>(
        client,
        `SELECT id, amount FROM ai_tracks_attempt_ops WHERE job_id = ? AND kind = ?`,
        [jobId, kind]
      )
      const row = rows[0]
      return row ? { id: row.id, amount: Number(row.amount) } : null
    },
    async insertOp(input) {
      try {
        await clientExecute(
          client,
          `INSERT INTO ai_tracks_attempt_ops (id, user_id, job_id, kind, amount) VALUES (?, ?, ?, ?, ?)`,
          [input.id, input.userId, input.jobId, input.kind, input.amount]
        )
        return "inserted"
      } catch (e: unknown) {
        const code =
          e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : ""
        if (code === "23505") return "duplicate"
        throw e
      }
    },
  }
}

/** Завершить job успехом (для будущего воркера). Идемпотентный commit. */
export async function markAiTracksJobSucceeded(params: {
  userId: string
  jobId: string
}): Promise<void> {
  await withTransaction(async (client) => {
    await runCommitAttempt(pgAttemptStore(client), params.userId, params.jobId)
    await clientExecute(
      client,
      `UPDATE ai_tracks_jobs
       SET status = 'SUCCEEDED', updated_at = NOW(), finished_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [params.jobId, params.userId]
    )
  })
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
