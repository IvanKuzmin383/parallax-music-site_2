/**
 * Сжатие картинки в браузере (canvas) перед превью / upload.
 * Сервер всё равно должен пережать - это только экономия трафика и памяти.
 */

export const CLIENT_TOOL_COVER_MAX_EDGE = 1400
export const CLIENT_TOOL_COVER_QUALITY = 0.82

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Не удалось прочитать изображение"))
    }
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Не удалось сжать изображение"))
      },
      type,
      quality,
    )
  })
}

export type CompressImageResult = {
  blob: Blob
  dataUrl: string
  width: number
  height: number
  mime: string
}

/**
 * Ужимает до maxEdge по длинной стороне, отдаёт webp (или jpeg) + data URL.
 */
export async function compressImageForToolCover(
  file: File,
  opts?: { maxEdge?: number; quality?: number },
): Promise<CompressImageResult> {
  const maxEdge = opts?.maxEdge ?? CLIENT_TOOL_COVER_MAX_EDGE
  const quality = opts?.quality ?? CLIENT_TOOL_COVER_QUALITY

  if (!file.type.startsWith("image/")) {
    throw new Error("Нужен файл изображения")
  }

  const img = await loadImageFromFile(file)
  const srcW = img.naturalWidth || img.width
  const srcH = img.naturalHeight || img.height
  if (!srcW || !srcH) {
    throw new Error("Не удалось определить размеры изображения")
  }

  const scale = Math.min(1, maxEdge / Math.max(srcW, srcH))
  const width = Math.max(1, Math.round(srcW * scale))
  const height = Math.max(1, Math.round(srcH * scale))

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas недоступен")
  ctx.drawImage(img, 0, 0, width, height)

  let mime = "image/webp"
  let blob: Blob
  try {
    blob = await canvasToBlob(canvas, "image/webp", quality)
    if (!blob.type.includes("webp") || blob.size === 0) {
      throw new Error("webp unsupported")
    }
  } catch {
    mime = "image/jpeg"
    blob = await canvasToBlob(canvas, "image/jpeg", quality)
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Не удалось прочитать сжатое изображение"))
    }
    reader.onerror = () => reject(new Error("Не удалось прочитать сжатое изображение"))
    reader.readAsDataURL(blob)
  })

  return { blob, dataUrl, width, height, mime }
}

/** File для FormData после клиентского сжатия. */
export function compressedCoverToFile(
  result: CompressImageResult,
  baseName = "cover",
): File {
  const ext = result.mime.includes("webp") ? "webp" : "jpg"
  return new File([result.blob], `${baseName}.${ext}`, { type: result.mime })
}
