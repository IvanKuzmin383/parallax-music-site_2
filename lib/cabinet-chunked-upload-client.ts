import { cabinetUploadRequest } from "@/lib/cabinet-upload-transport"
import { formatCabinetUploadFailure } from "@/lib/cabinet-upload-client"

const CHUNK_PUT_TIMEOUT_MS = 90_000
const CHUNK_PUT_RETRIES = 5

type InitResponse = {
  uploadId?: string
  chunkSize?: number
  totalChunks?: number
  error?: string
}

type StatusResponse = {
  received?: number[]
  totalChunks?: number
  chunkSize?: number
  fileSize?: number
  error?: string
}

const FALLBACK_CHUNK_SIZE = 1024 * 1024

function resumeKey(file: File): string {
  return `parallax-chunk-upload:${file.name}:${file.size}:${file.lastModified}`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T
  } catch {
    return {} as T
  }
}

async function putChunk(uploadId: string, index: number, blob: Blob): Promise<void> {
  let lastError: unknown
  for (let attempt = 0; attempt < CHUNK_PUT_RETRIES; attempt++) {
    try {
      const res = await cabinetUploadRequest(
        `/api/cabinet/upload-chunks/${encodeURIComponent(uploadId)}?index=${index}`,
        {
          method: "PUT",
          body: blob,
          credentials: "include",
          timeoutMs: CHUNK_PUT_TIMEOUT_MS,
          retries: 0,
        }
      )
      if (res.ok) return
      const body = await readJson<{ error?: string }>(res)
      const err = Object.assign(new Error(body.error || `Кусок ${index + 1} не принят (${res.status})`), {
        fatal: res.status === 401 || res.status === 403 || res.status === 404,
      })
      if (err.fatal) throw err
      lastError = err
    } catch (error) {
      lastError = error
      if (error && typeof error === "object" && "fatal" in error && (error as { fatal?: boolean }).fatal) {
        throw error
      }
    }
    await sleep(1000 * (attempt + 1))
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(formatCabinetUploadFailure(lastError, "Не удалось отправить кусок файла"))
}

/**
 * Режет WAV на куски ~1 МБ, докачивает недостающие, собирает на сервере.
 * Возвращает audioRelPath для привязки к черновику.
 */
export async function uploadWavInChunks(file: File): Promise<string> {
  if (file.size < 44) {
    throw new Error("Аудиофайл пустой. Загрузите WAV повторно")
  }

  let uploadId = ""
  try {
    uploadId = localStorage.getItem(resumeKey(file)) ?? ""
  } catch {
    uploadId = ""
  }

  if (uploadId) {
    const statusRes = await cabinetUploadRequest(
      `/api/cabinet/upload-chunks/${encodeURIComponent(uploadId)}`,
      { method: "GET", credentials: "include", timeoutMs: 30_000, retries: 1 }
    )
    if (!statusRes.ok) {
      try {
        localStorage.removeItem(resumeKey(file))
      } catch {
        // ignore
      }
      uploadId = ""
    }
  }

  if (!uploadId) {
    const initRes = await cabinetUploadRequest("/api/cabinet/upload-chunks", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: file.name, fileSize: file.size }),
      timeoutMs: 30_000,
      retries: 2,
    })
    const initBody = await readJson<InitResponse>(initRes)
    if (!initRes.ok || !initBody.uploadId || !initBody.chunkSize || !initBody.totalChunks) {
      throw new Error(initBody.error || "Не удалось начать загрузку файла")
    }
    uploadId = initBody.uploadId
    try {
      localStorage.setItem(resumeKey(file), uploadId)
    } catch {
      // ignore quota
    }
  }

  const statusRes = await cabinetUploadRequest(
    `/api/cabinet/upload-chunks/${encodeURIComponent(uploadId)}`,
    { method: "GET", credentials: "include", timeoutMs: 30_000, retries: 2 }
  )
  const statusBody = await readJson<StatusResponse>(statusRes)
  if (!statusRes.ok) {
    throw new Error(statusBody.error || "Не удалось продолжить загрузку")
  }

  const received = new Set(statusBody.received ?? [])
  const totalChunks = statusBody.totalChunks ?? 0
  const chunkSize = statusBody.chunkSize || FALLBACK_CHUNK_SIZE
  if (totalChunks < 1) {
    throw new Error("Не удалось продолжить загрузку")
  }
  if (typeof statusBody.fileSize === "number" && statusBody.fileSize !== file.size) {
    try {
      localStorage.removeItem(resumeKey(file))
    } catch {
      // ignore
    }
    throw new Error("Файл изменился. Выберите WAV заново и загрузите ещё раз")
  }

  for (let index = 0; index < totalChunks; index++) {
    if (received.has(index)) continue
    const start = index * chunkSize
    const end = Math.min(file.size, start + chunkSize)
    await putChunk(uploadId, index, file.slice(start, end))
    received.add(index)
  }

  const completeRes = await cabinetUploadRequest(
    `/api/cabinet/upload-chunks/${encodeURIComponent(uploadId)}/complete`,
    { method: "POST", credentials: "include", timeoutMs: 120_000, retries: 2 }
  )
  const completeBody = await readJson<{ audioRelPath?: string; error?: string }>(completeRes)
  if (!completeRes.ok || !completeBody.audioRelPath) {
    throw new Error(completeBody.error || "Не удалось собрать файл на сервере")
  }
  try {
    localStorage.removeItem(resumeKey(file))
  } catch {
    // ignore
  }
  return completeBody.audioRelPath
}

export async function saveCabinetDraftPayload(params: {
  draftId: string | null
  kind: "single" | "album"
  payload: unknown
  audioRelPath?: string
  cover?: File
}): Promise<Response> {
  const url = params.draftId
    ? `/api/cabinet/upload-drafts/${encodeURIComponent(params.draftId)}`
    : "/api/cabinet/upload-drafts"
  const method = params.draftId ? "PATCH" : "POST"

  if (params.cover || !params.draftId) {
    const fd = new FormData()
    if (!params.draftId) fd.append("kind", params.kind)
    fd.append("payload", JSON.stringify(params.payload))
    if (params.audioRelPath) fd.append("audioRelPath", params.audioRelPath)
    if (params.cover) fd.append("cover", params.cover)
    return cabinetUploadRequest(url, { method, body: fd, credentials: "include" })
  }

  return cabinetUploadRequest(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      payload: params.payload,
      ...(params.audioRelPath ? { audioRelPath: params.audioRelPath } : {}),
    }),
  })
}
