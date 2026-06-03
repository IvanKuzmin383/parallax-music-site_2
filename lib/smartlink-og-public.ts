import { mkdir, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { renderSmartlinkOgCoverBuffer } from "@/lib/smartlink-cover"

const OG_COVERS_DIR = path.join(process.cwd(), "public", "og-covers")

/** Публичный JPEG для Telegram: nginx/Next отдаёт файл без Node/Sharp. */
export function smartlinkPublicOgFilePath(slug: string): string {
  return path.join(OG_COVERS_DIR, `${slug}.jpg`)
}

export function smartlinkPublicOgUrl(slug: string, siteUrl?: string): string {
  const base = siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  return new URL(`/og-covers/${slug}.jpg`, base).href
}

/**
 * Создаёт/обновляет public/og-covers/{slug}.jpg при изменении обложки.
 * Возвращает абсолютный URL для og:image или null.
 */
export async function ensureSmartlinkPublicOgJpeg(
  slug: string,
  siteUrl?: string
): Promise<string | null> {
  const buffer = await renderSmartlinkOgCoverBuffer(slug)
  if (!buffer) return null

  await mkdir(OG_COVERS_DIR, { recursive: true })
  const filePath = smartlinkPublicOgFilePath(slug)
  await writeFile(filePath, buffer)

  return smartlinkPublicOgUrl(slug, siteUrl)
}

/** Нужно ли перегенерировать файл (нет на диске). */
export async function smartlinkPublicOgNeedsRefresh(slug: string): Promise<boolean> {
  try {
    await stat(smartlinkPublicOgFilePath(slug))
    return false
  } catch {
    return true
  }
}
