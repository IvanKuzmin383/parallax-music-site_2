import { imageSize } from "image-size"
import { readFilePrefix } from "@/lib/node-streaming-multipart"

export const MAX_CABINET_COVER_BYTES = 20 * 1024 * 1024

const PREFIX_STEPS = [64 * 1024, 256 * 1024, 1024 * 1024, 4 * 1024 * 1024, 12 * 1024 * 1024] as const

function tryParseDimensions(buffer: Buffer): { width: number; height: number } | null {
  try {
    const d = imageSize(buffer)
    if (d.width && d.height) return { width: d.width, height: d.height }
  } catch {
    // неполный или битый префикс
  }
  return null
}

/**
 * Те же правила, что при POST /api/cabinet/tracks: JPEG/PNG, до 20 MB, 3000×3000.
 * @param extLower расширение без точки, в нижнем регистре (из имени файла или пути)
 * @returns текст ошибки или null, если файл допустим
 */
export function validateCabinetCoverImage(
  buffer: Buffer,
  extLower: string | undefined
): string | null {
  if (!extLower || !["jpg", "jpeg", "png"].includes(extLower)) {
    return "Обложка должна быть в формате JPEG или PNG"
  }
  if (buffer.length > MAX_CABINET_COVER_BYTES) {
    return "Размер обложки не должен превышать 20 MB"
  }
  const dimensions = tryParseDimensions(buffer)
  if (!dimensions) {
    return "Не удалось определить размеры обложки. Загрузите корректный JPEG/PNG файл."
  }
  if (dimensions.width !== 3000 || dimensions.height !== 3000) {
    return "Обложка должна быть строго 3000×3000 пикселей"
  }
  return null
}

/**
 * Проверка обложки по пути к файлу без чтения всего файла в память (ступенчато, по префиксу).
 */
export async function validateCabinetCoverImageFromFilePath(
  filePath: string,
  extLower: string | undefined,
  fileSizeBytes: number
): Promise<string | null> {
  if (!extLower || !["jpg", "jpeg", "png"].includes(extLower)) {
    return "Обложка должна быть в формате JPEG или PNG"
  }
  if (fileSizeBytes > MAX_CABINET_COVER_BYTES) {
    return "Размер обложки не должен превышать 20 MB"
  }
  if (fileSizeBytes <= 0) {
    return "Не удалось определить размеры обложки. Загрузите корректный JPEG/PNG файл."
  }

  let lastReadCap = 0
  let dimensions: { width: number; height: number } | null = null

  for (const step of PREFIX_STEPS) {
    const cap = Math.min(step, fileSizeBytes)
    if (cap <= lastReadCap) continue
    const prefix = await readFilePrefix(filePath, cap)
    lastReadCap = prefix.length
    dimensions = tryParseDimensions(prefix)
    if (dimensions) break
    if (cap >= fileSizeBytes) break
  }

  if (!dimensions && lastReadCap < fileSizeBytes) {
    const full = await readFilePrefix(filePath, fileSizeBytes)
    dimensions = tryParseDimensions(full)
  }

  if (!dimensions) {
    return "Не удалось определить размеры обложки. Загрузите корректный JPEG/PNG файл."
  }
  if (dimensions.width !== 3000 || dimensions.height !== 3000) {
    return "Обложка должна быть строго 3000×3000 пикселей"
  }
  return null
}
