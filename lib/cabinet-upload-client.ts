/** Клиентские утилиты загрузки релизов (кабинет). */

const WAV_MIME_HINTS = ["audio/wav", "audio/wave", "audio/x-wav", "audio/vnd.wave"] as const

export const WAV_FILE_READ_ERROR =
  "Не удалось прочитать файл на устройстве. Сохраните WAV на телефон (не «только в iCloud») и выберите снова."

/** Имя .wav или MIME WAV; пустой type на iOS - допускаем, сервер проверит содержимое. */
export function isLikelyWavFile(file: File): boolean {
  const name = (file.name ?? "").toLowerCase()
  if (name.endsWith(".wav")) return true
  const type = (file.type ?? "").toLowerCase()
  if (type && WAV_MIME_HINTS.some((m) => type === m || type.includes("wav"))) return true
  if (type.startsWith("image/") || type.startsWith("video/") || type === "audio/mpeg" || type === "audio/mp4") {
    return false
  }
  if (!name.includes(".") && !type) return true
  return false
}

export type CabinetApiJsonBody = { error?: string }

/** Парсит JSON ответа API кабинета; при ошибке парсинга возвращает `{ error }`. */
export async function parseCabinetApiJson<T = CabinetApiJsonBody>(
  response: Response
): Promise<T & CabinetApiJsonBody> {
  try {
    return (await response.json()) as T & CabinetApiJsonBody
  } catch {
    const fallback = (message: string): T & CabinetApiJsonBody =>
      ({ error: message }) as T & CabinetApiJsonBody
    if (response.status === 413) {
      return fallback("Файл слишком большой (макс. 80 MB для аудио, 20 MB для обложки).")
    }
    if (response.status >= 500) {
      return fallback(`Ошибка сервера (${response.status}). Попробуйте позже или через Wi‑Fi.`)
    }
    return fallback(
      `Не удалось разобрать ответ сервера (${response.status}). Проверьте интернет и попробуйте снова.`
    )
  }
}

export const MAX_CABINET_COVER_BYTES_CLIENT = 20 * 1024 * 1024
export const COVER_REQUIRED_PX = 3000

export const COVER_HEIC_ERROR =
  "Формат HEIC с iPhone не поддерживается. Сохраните обложку как JPEG или PNG (3000×3000 px) и выберите снова."

export const COVER_IMAGE_READ_ERROR =
  "Не удалось прочитать изображение на устройстве. Скачайте файл на телефон (не «только в iCloud») и выберите снова."

export function isHeicCoverFile(file: File): boolean {
  const name = (file.name ?? "").toLowerCase()
  const ext = name.split(".").pop() ?? ""
  const type = (file.type ?? "").toLowerCase()
  return ext === "heic" || ext === "heif" || type === "image/heic" || type === "image/heif"
}

/** JPEG/PNG по имени или MIME; HEIC и WebP — нет. */
export function isLikelyCoverImage(file: File): boolean {
  if (isHeicCoverFile(file)) return false
  const name = (file.name ?? "").toLowerCase()
  const ext = name.split(".").pop() ?? ""
  if (["jpg", "jpeg", "png"].includes(ext)) return true
  const type = (file.type ?? "").toLowerCase()
  if (type === "image/jpeg" || type === "image/png") return true
  if (type === "image/webp" || type === "image/gif") return false
  if (!ext && !type) return true
  return false
}

export function isCabinetCoverValidationMessage(message: string): boolean {
  const lower = message.toLowerCase()
  return (
    message.includes("Обложка должна быть в формате JPEG или PNG") ||
    message.includes("Обложка должна быть строго 3000×3000") ||
    message.includes("Не удалось определить размеры обложки") ||
    message.includes("Размер обложки не должен превышать") ||
    message.includes(COVER_HEIC_ERROR) ||
    message.includes(COVER_IMAGE_READ_ERROR) ||
    message.includes("Не удалось прочитать изображение") ||
    message.includes("Не удалось проверить обложку") ||
    lower.includes("обложка")
  )
}

/** Проверка обложки в браузере до отправки (формат, размер, 3000×3000). */
export async function validateCoverFileClient(file: File): Promise<string | null> {
  if (isHeicCoverFile(file)) return COVER_HEIC_ERROR
  if (!isLikelyCoverImage(file)) {
    return "Обложка должна быть в формате JPEG или PNG"
  }
  if (file.size > MAX_CABINET_COVER_BYTES_CLIENT) {
    return "Размер обложки не должен превышать 20 MB"
  }

  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file)
      try {
        const { width, height } = bitmap
        if (width !== COVER_REQUIRED_PX || height !== COVER_REQUIRED_PX) {
          return `Обложка должна быть строго 3000×3000 пикселей (у вашего файла ${width}×${height}).`
        }
        return null
      } finally {
        bitmap.close()
      }
    }

    return await new Promise<string | null>((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        const { width, height } = img
        if (width !== COVER_REQUIRED_PX || height !== COVER_REQUIRED_PX) {
          resolve(
            `Обложка должна быть строго 3000×3000 пикселей (у вашего файла ${width}×${height}).`
          )
          return
        }
        resolve(null)
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve("Не удалось прочитать изображение. Загрузите корректный JPEG или PNG 3000×3000.")
      }
      img.src = url
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotReadableError") {
      return COVER_IMAGE_READ_ERROR
    }
    return "Не удалось проверить обложку. Загрузите JPEG или PNG 3000×3000 px."
  }
}

export function formatCabinetUploadFailure(
  error: unknown,
  fallback: string,
  variant: "wav" | "cover" = "wav"
): string {
  if (error instanceof DOMException) {
    if (error.name === "AbortError") {
      return "Загрузка заняла слишком много времени. Проверьте интернет-соединение и попробуйте снова."
    }
    if (error.name === "NotReadableError") {
      return variant === "cover" ? COVER_IMAGE_READ_ERROR : WAV_FILE_READ_ERROR
    }
  }
  if (error instanceof Error) {
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return "Нет связи с сервером. Проверьте интернет и попробуйте снова."
    }
    if (error.message.trim()) return error.message
  }
  return fallback
}
