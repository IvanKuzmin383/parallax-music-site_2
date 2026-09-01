/**
 * Загрузка FormData в кабинет: XHR вместо fetch.
 * Safari на мобильном часто рвёт fetch больших WAV («Load failed» / Failed to fetch),
 * а жёсткий abort через 180 с убивает файл ещё на 4G.
 */

export function estimateFormDataBytes(body: FormData | BodyInit | null | undefined): number {
  if (!(typeof FormData !== "undefined" && body instanceof FormData)) return 0
  let n = 0
  for (const value of body.values()) {
    if (typeof File !== "undefined" && value instanceof File) n += value.size
    else if (typeof Blob !== "undefined" && value instanceof Blob) n += value.size
    else n += new TextEncoder().encode(String(value)).length
  }
  return n
}

/** Таймаут от размера тела: минимум 10 мин, максимум 25 мин, ориентир ~32 КБ/с. */
export function cabinetUploadTimeoutMs(bodyBytes: number): number {
  const minMs = 10 * 60 * 1000
  const maxMs = 25 * 60 * 1000
  const bytesPerSec = 32 * 1024
  const fromSize = Math.ceil(Math.max(0, bodyBytes) / bytesPerSec) * 1000 + 120_000
  return Math.min(maxMs, Math.max(minMs, fromSize))
}

export function isLikelyMobileUploadClient(): boolean {
  if (typeof navigator === "undefined") return false
  const ua = navigator.userAgent || ""
  if (/iPhone|iPad|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    return true
  }
  if (typeof window === "undefined") return false
  return navigator.maxTouchPoints > 1 && window.matchMedia("(max-width: 900px)").matches
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function xhrSendBody(
  url: string,
  method: string,
  body: FormData | Blob,
  timeoutMs: number
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open(method, url, true)
    xhr.withCredentials = true
    xhr.responseType = "text"
    xhr.timeout = timeoutMs
    if (!(typeof FormData !== "undefined" && body instanceof FormData)) {
      xhr.setRequestHeader("Content-Type", "application/octet-stream")
    }

    xhr.onload = () => {
      const headers = new Headers()
      const raw = xhr.getAllResponseHeaders()
      raw
        .trim()
        .split(/[\r\n]+/)
        .forEach((line) => {
          const idx = line.indexOf(":")
          if (idx > 0) headers.append(line.slice(0, idx).trim(), line.slice(idx + 1).trim())
        })
      resolve(
        new Response(xhr.responseText ?? "", {
          status: xhr.status || 0,
          statusText: xhr.statusText,
          headers,
        })
      )
    }

    xhr.onerror = () => {
      reject(new TypeError("Failed to fetch"))
    }
    xhr.ontimeout = () => {
      reject(new DOMException("The operation was aborted.", "AbortError"))
    }
    xhr.onabort = () => {
      reject(new DOMException("The operation was aborted.", "AbortError"))
    }

    xhr.send(body)
  })
}

async function fetchWithHardTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export type CabinetUploadRequestInit = RequestInit & {
  timeoutMs?: number
  retries?: number
}

/**
 * POST/PATCH с файлами: XMLHttpRequest + длинный таймаут + повторы при обрыве сети.
 * JSON без файлов: обычный fetch с таймаутом 60 с.
 */
export async function cabinetUploadRequest(
  url: string,
  init: CabinetUploadRequestInit
): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase()
  const body = init.body
  const isForm = typeof FormData !== "undefined" && body instanceof FormData
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob && !isForm
  const bytes = isForm ? estimateFormDataBytes(body) : isBlob ? body.size : 0

  let lastError: unknown
  const { timeoutMs: timeoutOverride, retries: retriesOverride, ...fetchInit } = init
  const timeoutMs =
    timeoutOverride ?? (bytes > 0 && (isForm || isBlob) ? cabinetUploadTimeoutMs(bytes) : 60_000)
  const retries = retriesOverride ?? (isForm && bytes > 256 * 1024 ? 2 : 0)

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      if (isForm && body instanceof FormData) {
        return await xhrSendBody(url, method, body, timeoutMs)
      }
      if (isBlob && body instanceof Blob) {
        return await xhrSendBody(url, method, body, timeoutMs)
      }
      return await fetchWithHardTimeout(url, fetchInit, timeoutMs)
    } catch (error) {
      lastError = error
      const aborted = error instanceof DOMException && error.name === "AbortError"
      if (aborted) throw error
      if (attempt >= retries) throw error
      await sleep(1500 * (attempt + 1))
    }
  }
  throw lastError instanceof Error ? lastError : new TypeError("Failed to fetch")
}
