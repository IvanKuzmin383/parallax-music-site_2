import type { Metadata } from "next"
import { connection } from "next/server"
import { getPublicSmartlink, smartlinkOgImagePath } from "@/lib/smartlink"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

/**
 * OG/Twitter для /s/[slug]. connection() - metadata в <head> до стрима HTML
 * (иначе Telegram и др. html-limited боты не видят теги в body).
 */
export async function buildSmartlinkMetadata(slug: string): Promise<Metadata> {
  await connection()

  let pub: Awaited<ReturnType<typeof getPublicSmartlink>> = null
  try {
    pub = await getPublicSmartlink(slug)
  } catch (error) {
    console.error("[smartlink] buildSmartlinkMetadata error:", error)
  }

  if (!pub) {
    return {
      title: "Не найдено",
      robots: { index: false, follow: false },
    }
  }

  const pageUrl = new URL(`/s/${slug}`, siteUrl).href
  const coverPath = smartlinkOgImagePath(slug)
  const title = `${pub.title} - ${pub.artistName} | Parallax Music`
  const description = `Слушайте «${pub.title}» от ${pub.artistName} на всех платформах`

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      images: [{ url: coverPath, width: 1200, height: 1200, alt: pub.title }],
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
