import { notFound } from "next/navigation"
import { Metadata } from "next"
import { getTrackBySmartlinkSlug } from "@/lib/tracks"
import { SMARTLINK_PLATFORMS } from "@/lib/smartlink-platforms"
import type { PlatformLinks } from "@/lib/smartlink-platforms"

const SLUG_REGEX = /^[a-zA-Z0-9_-]{6,20}$/

interface SmartlinkPageProps {
  params: Promise<{ slug: string }>
}

async function getSmartlinkData(slug: string) {
  if (!SLUG_REGEX.test(slug)) return null
  try {
    const track = await getTrackBySmartlinkSlug(slug)
    if (!track || track.status !== "released") return null
    return track
  } catch (error) {
    console.error("[smartlink] getSmartlinkData error:", error)
    return null
  }
}

export async function generateMetadata({ params }: SmartlinkPageProps): Promise<Metadata> {
  const { slug } = await params
  let track: Awaited<ReturnType<typeof getSmartlinkData>> = null
  try {
    track = await getSmartlinkData(slug)
  } catch (error) {
    console.error("[smartlink] generateMetadata error:", error)
  }
  if (!track) {
    return { title: "Не найдено" }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  const coverUrl = `${siteUrl}/api/smartlink/${slug}/cover`
  const title = `${track.trackName} — ${track.artistName} | Parallax Music`
  const description = `Слушайте «${track.trackName}» от ${track.artistName} на всех платформах`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: coverUrl, width: 1200, height: 1200, alt: track.trackName }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [coverUrl],
    },
  }
}

function getLinksList(links: PlatformLinks | undefined) {
  if (!links) return []
  return SMARTLINK_PLATFORMS.filter((p) => {
    const url = links[p.key as keyof PlatformLinks]
    return typeof url === "string" && url.trim().length > 0
  }).map((p) => ({ key: p.key, label: p.label, url: links[p.key as keyof PlatformLinks]! }))
}

export default async function SmartlinkPage({ params }: SmartlinkPageProps) {
  const { slug } = await params
  const track = await getSmartlinkData(slug)
  if (!track) notFound()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
  const coverUrl = `${siteUrl}/api/smartlink/${slug}/cover`
  const linksList = getLinksList(track.platformLinks)

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <div className="w-full aspect-square max-w-[280px] rounded-xl overflow-hidden border border-border shadow-lg bg-muted">
          <img
            src={coverUrl}
            alt={track.trackName}
            className="w-full h-full object-cover"
            sizes="280px"
          />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">{track.trackName}</h1>
          <p className="text-lg text-muted-foreground">{track.artistName}</p>
        </div>
        <p className="text-sm text-muted-foreground">Слушайте на платформах</p>
        <div className="w-full flex flex-col gap-2">
          {linksList.map(({ key, label, url }) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full h-10 rounded-md px-6 border border-input bg-background text-sm font-medium shadow-xs hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
        <a
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-4"
        >
          Parallax Music
        </a>
      </div>
    </div>
  )
}
