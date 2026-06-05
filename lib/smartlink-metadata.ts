import type { Metadata } from "next"
import { connection } from "next/server"
import { getReleasedSmartlinkTrack, smartlinkOgImagePath } from "@/lib/smartlink"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

/**
 * OG/Twitter для /s/[slug]. connection() — metadata в <head> до стрима HTML
 * (иначе Telegram и др. html-limited боты не видят теги в body).
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

  const pageUrl = new URL(`/s/${slug}`, siteUrl).href
  const coverPath = smartlinkOgImagePath(slug)
  const title = `${track.trackName} - ${track.artistName} | Parallax Music`
  const description = `Слушайте «${track.trackName}» от ${track.artistName} на всех платформах`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [{ url: coverPath, width: 1200, height: 1200, alt: track.trackName }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [coverPath],
    },
  }
}
