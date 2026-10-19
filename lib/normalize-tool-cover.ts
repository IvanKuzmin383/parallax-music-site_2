import sharp from "sharp"
import {
  cabinetCoverSharpSemaphore,
  ensureCabinetCoverSharpConfigured,
} from "@/lib/cover-sharp-config"

ensureCabinetCoverSharpConfigured()

/** Макс. сторона для обложек инструментов (смартлинк, сниппет) - не релизный 3000. */
export const TOOL_COVER_MAX_EDGE = 1400
export const TOOL_COVER_WEBP_QUALITY = 82
export const TOOL_COVER_JPEG_QUALITY = 85
/** Сырой вход до нормализации. */
export const TOOL_COVER_MAX_INPUT_BYTES = 8 * 1024 * 1024

export type NormalizedToolCover = {
  buffer: Buffer
  ext: "webp" | "jpg"
  contentType: "image/webp" | "image/jpeg"
  width: number
  height: number
}

function buildPipeline(input: Buffer, maxEdge: number) {
  return sharp(input, { failOn: "none", sequentialRead: true })
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
}

/**
 * Сжать и ужать обложку для смартлинка / сниппета.
 * WebP по умолчанию; при сбое кодирования - JPEG.
 */
export async function normalizeToolCoverBuffer(
  input: Buffer,
  opts?: { maxEdge?: number; preferWebp?: boolean },
): Promise<NormalizedToolCover> {
  const maxEdge = opts?.maxEdge ?? TOOL_COVER_MAX_EDGE
  const preferWebp = opts?.preferWebp !== false

  return cabinetCoverSharpSemaphore.runExclusive(async () => {
    if (preferWebp) {
      try {
        const buffer = await buildPipeline(input, maxEdge)
          .webp({ quality: TOOL_COVER_WEBP_QUALITY, effort: 4 })
          .toBuffer()
        const meta = await sharp(buffer).metadata()
        return {
          buffer,
          ext: "webp",
          contentType: "image/webp",
          width: meta.width ?? maxEdge,
          height: meta.height ?? maxEdge,
        }
      } catch {
        // fallback JPEG
      }
    }

    const buffer = await buildPipeline(input, maxEdge)
      .jpeg({ quality: TOOL_COVER_JPEG_QUALITY, mozjpeg: true })
      .toBuffer()
    const meta = await sharp(buffer).metadata()
    return {
      buffer,
      ext: "jpg",
      contentType: "image/jpeg",
      width: meta.width ?? maxEdge,
      height: meta.height ?? maxEdge,
    }
  })
}

export function isToolCoverInputMime(type: string): boolean {
  const t = type.toLowerCase()
  return (
    t === "image/jpeg" ||
    t === "image/jpg" ||
    t === "image/png" ||
    t === "image/webp" ||
    t === "image/gif"
  )
}
