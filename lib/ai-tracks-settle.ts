import crypto from "crypto"
import { promises as fs } from "fs"
import path from "path"
import { AI_TRACKS_PRICE_RUB } from "@/lib/ai-tracks-config"
import { refundAiTracksGeneration } from "@/lib/ai-tracks-billing"
import { getAiTracksProvider } from "@/lib/ai-tracks-provider"
import { sanitizeRemoteMessage } from "@/lib/ai-tracks-remote"
import {
  clientExecute,
  clientQuery,
  execute,
  queryOne,
  withTransaction,
} from "@/lib/database"
import { aiTracksDownloadWavPath, ensureAiTracksWavFile } from "@/lib/ai-tracks-wav"
import { getUploadsBasePath } from "@/lib/tracks"

type JobRow = {
  id: string
  user_id: string
  status: string
  cost_attempts: number
  external_task_id: string | null
}

export type SettleVariantInput = {
  index: number
  title: string
  audioUrl: string
  coverUrl?: string
  durationSec?: number
  format?: string
  externalId?: string
}

async function downloadToUploads(params: {
  remoteUrl: string
  storageKey: string
}): Promise<boolean> {
  const base = await getUploadsBasePath()
  const full = path.join(base, params.storageKey)
  const dir = path.dirname(full)
  await fs.mkdir(dir, { recursive: true })

  const res = await fetch(params.remoteUrl, { cache: "no-store" })
  if (!res.ok) return false
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.byteLength < 1000) return false
  await fs.writeFile(full, buf)
  return true
}

async function claimJob(jobId: string): Promise<JobRow | null> {
  return withTransaction(async (client) => {
    const rows = await clientQuery<JobRow>(
      client,
      `SELECT id, user_id, status, cost_attempts, external_task_id
       FROM ai_tracks_jobs WHERE id = ? FOR UPDATE`,
      [jobId]
    )
    const row = rows[0]
    if (!row) return null
    if (row.status === "SUCCEEDED" || row.status === "FAILED") return null
    if (row.status === "TRANSFERRING") return null
    await clientExecute(
      client,
      `UPDATE ai_tracks_jobs SET status = 'TRANSFERRING', updated_at = NOW() WHERE id = ?`,
      [jobId]
    )
    return row
  })
}

export async function failAiTracksJob(params: {
  jobId: string
  userId: string
  message: string
  code?: string
  priceRub?: number
}): Promise<void> {
  const updated = await execute(
    `UPDATE ai_tracks_jobs
     SET status = 'FAILED',
         error_code = ?,
         error_message = ?,
         updated_at = NOW(),
         finished_at = NOW()
     WHERE id = ? AND user_id = ? AND status NOT IN ('SUCCEEDED', 'FAILED')`,
    [
      params.code || "failed",
      sanitizeRemoteMessage(params.message).slice(0, 500) || "Не удалось завершить генерацию",
      params.jobId,
      params.userId,
    ]
  )
  if (!updated) return
  await refundAiTracksGeneration({
    userId: params.userId,
    jobId: params.jobId,
    priceRub: params.priceRub ?? AI_TRACKS_PRICE_RUB,
  })
}

export async function settleAiTracksJobSuccess(params: {
  jobId: string
  variants: SettleVariantInput[]
}): Promise<{ ok: boolean }> {
  const claimed = await claimJob(params.jobId)
  if (!claimed) return { ok: false }

  const priceRub = Number(claimed.cost_attempts) || AI_TRACKS_PRICE_RUB

  try {
    if (!params.variants.length) {
      await failAiTracksJob({
        jobId: claimed.id,
        userId: claimed.user_id,
        message: "Пустой результат генерации",
        code: "empty_result",
        priceRub,
      })
      return { ok: false }
    }

    for (const variant of params.variants) {
      const resultId = crypto.randomUUID()
      const audioKey = `ai-tracks/${claimed.user_id}/${claimed.id}/${variant.index}.mp3`
      const audioOk = await downloadToUploads({
        remoteUrl: variant.audioUrl,
        storageKey: audioKey,
      })
      if (!audioOk) {
        await failAiTracksJob({
          jobId: claimed.id,
          userId: claimed.user_id,
          message: "Не удалось сохранить аудио",
          code: "download_failed",
          priceRub,
        })
        return { ok: false }
      }

      // Прогрев WAV в фоне: иначе первый «Скачать WAV» долго крутит ffmpeg
      // и прокси рвёт соединение («Сайт недоступен» в браузере).
      void (async () => {
        try {
          const base = await getUploadsBasePath()
          const sourcePath = path.join(base, audioKey)
          const destPath = aiTracksDownloadWavPath(sourcePath)
          const prepared = await ensureAiTracksWavFile({
            sourcePath,
            format: variant.format || "mp3",
            destPath,
          })
          if (!prepared.ok) {
            console.warn("[ai-tracks-settle] wav prewarm failed", prepared.error)
          }
        } catch (err) {
          console.warn("[ai-tracks-settle] wav prewarm error", err)
        }
      })()

      let coverKey: string | null = null
      if (variant.coverUrl) {
        const ck = `ai-tracks/${claimed.user_id}/${claimed.id}/${variant.index}.jpg`
        const coverOk = await downloadToUploads({
          remoteUrl: variant.coverUrl,
          storageKey: ck,
        })
        if (coverOk) coverKey = ck
      }

      await execute(
        `INSERT INTO ai_tracks_results (
          id, job_id, user_id, variant_index, title, duration_sec,
          audio_storage_key, cover_storage_key, audio_format, is_favorite, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE, ?, NOW())
        ON CONFLICT (job_id, variant_index) DO UPDATE SET
          title = EXCLUDED.title,
          duration_sec = EXCLUDED.duration_sec,
          audio_storage_key = EXCLUDED.audio_storage_key,
          cover_storage_key = EXCLUDED.cover_storage_key,
          audio_format = EXCLUDED.audio_format,
          metadata_json = EXCLUDED.metadata_json`,
        [
          resultId,
          claimed.id,
          claimed.user_id,
          variant.index,
          (variant.title || "Без названия").slice(0, 200),
          variant.durationSec ?? null,
          audioKey,
          coverKey,
          variant.format || "mp3",
          JSON.stringify({
            externalId: variant.externalId || null,
          }),
        ]
      )
    }

    await execute(
      `UPDATE ai_tracks_jobs
       SET status = 'SUCCEEDED', error_code = NULL, error_message = NULL,
           updated_at = NOW(), finished_at = NOW()
       WHERE id = ?`,
      [claimed.id]
    )
    return { ok: true }
  } catch (e) {
    console.error("[ai-tracks-settle] success path failed")
    await failAiTracksJob({
      jobId: claimed.id,
      userId: claimed.user_id,
      message: "Не удалось сохранить результат",
      code: "settle_error",
      priceRub,
    })
    return { ok: false }
  }
}

export async function settleAiTracksJobFromCallback(params: {
  externalTaskId: string
  success: boolean
  message?: string
  variants?: SettleVariantInput[]
}): Promise<void> {
  const job = await queryOne<JobRow>(
    `SELECT id, user_id, status, cost_attempts, external_task_id
     FROM ai_tracks_jobs WHERE external_task_id = ?`,
    [params.externalTaskId]
  )
  if (!job) return
  if (job.status === "SUCCEEDED" || job.status === "FAILED") return

  if (!params.success) {
    await failAiTracksJob({
      jobId: job.id,
      userId: job.user_id,
      message: params.message || "Не удалось завершить генерацию",
      code: "provider_failed",
      priceRub: Number(job.cost_attempts) || AI_TRACKS_PRICE_RUB,
    })
    return
  }

  await settleAiTracksJobSuccess({
    jobId: job.id,
    variants: params.variants || [],
  })
}

/** Poll внешнего статуса для активной задачи. */
export async function syncAiTracksJobWithProvider(jobId: string): Promise<void> {
  const job = await queryOne<JobRow>(
    `SELECT id, user_id, status, cost_attempts, external_task_id
     FROM ai_tracks_jobs WHERE id = ?`,
    [jobId]
  )
  if (!job?.external_task_id) return
  if (!["QUEUED", "RUNNING", "RECONCILING"].includes(job.status)) return

  const provider = getAiTracksProvider()
  const status = await provider.getStatus(job.external_task_id)

  if (status.status === "succeeded") {
    await settleAiTracksJobSuccess({
      jobId: job.id,
      variants: status.variants,
    })
    return
  }

  if (status.status === "failed") {
    await failAiTracksJob({
      jobId: job.id,
      userId: job.user_id,
      message: status.message,
      code: "provider_failed",
      priceRub: Number(job.cost_attempts) || AI_TRACKS_PRICE_RUB,
    })
  }
}

export async function syncAiTracksJobsWithProvider(jobIds: string[]): Promise<void> {
  const unique = [...new Set(jobIds.filter(Boolean))]
  for (const id of unique) {
    try {
      await syncAiTracksJobWithProvider(id)
    } catch {
      console.error("[ai-tracks-settle] sync failed")
    }
  }
}
