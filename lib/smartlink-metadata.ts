import type { Metadata } from "next"
import { connection } from "next/server"
import { getReleasedSmartlinkTrack } from "@/lib/smartlink"
import { ensureSmartlinkPublicOgJpeg } from "@/lib/smartlink-og-public"
import {
  SMARTLINK_OG_HEIGHT,
  SMARTLINK_OG_WIDTH,
} from "@/lib/smartlink-cover"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

/**
 * OG/Twitter для /s/[slug]. Статический /og-covers/{slug}.jpg + теги в <head>.
 */
export async function buildSmartlinkMetadata(slug: string): Promise<Metadata> {
  await connection()

  let track: Awaited<ReturnType<typeof getReleasedSmartlinkTrack>> = null
  try {
    track = await getReleasedSmartlinkTrack(slug)
  } catch (error) {
    console.error("[smartlink] buildSmartlinkMetadata error:", error)
  }

  if (!track) {
    return {
      title: "Не найдено",
      robots: { index: false, follow: false },
    }
  }

  const imageUrl = await ensureSmartlinkPublicOgJpeg(slug, siteUrl)
  const pageUrl = new URL(`/s/${slug}`, siteUrl).href
  const title = `${track.trackName} - ${track.artistName} | Parallax Music`
  const description = `Слушайте «${track.trackName}» от ${track.artistName} на всех платформах`

  const ogImages = imageUrl
    ? [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          type: "image/jpeg" as const,
          width: SMARTLINK_OG_WIDTH,
          height: SMARTLINK_OG_HEIGHT,
          alt: track.trackName,
        },
      ]
    : []

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Parallax Music",
      locale: "ru_RU",
      images: ogImages,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}
