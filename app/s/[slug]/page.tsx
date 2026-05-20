import { notFound } from "next/navigation"
import { Metadata } from "next"
import { SMARTLINK_PLATFORMS } from "@/lib/smartlink-platforms"
import type { PlatformLinks } from "@/lib/smartlink-platforms"
import { getReleasedSmartlinkTrack, smartlinkOgImagePath } from "@/lib/smartlink"

interface SmartlinkPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: SmartlinkPageProps): Promise<Metadata> {
  const { slug } = await params
  let track: Awaited<ReturnType<typeof getReleasedSmartlinkTrack>> = null
  try {
    track = await getReleasedSmartlinkTrack(slug)
  } catch (error) {
    console.error("[smartlink] generateMetadata error:", error)
  }
  if (!track) {
    return { title: "Не найдено" }
  }

  const coverPath = smartlinkOgImagePath(slug)
  const title = `${track.trackName} - ${track.artistName} | Parallax Music`
  const description = `Слушайте «${track.trackName}» от ${track.artistName} на всех платформах`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
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

function getLinksList(links: PlatformLinks | undefined) {
  if (!links) return []
  return SMARTLINK_PLATFORMS.filter((p) => {
    const url = links[p.key as keyof PlatformLinks]
    return typeof url === "string" && url.trim().length > 0
  }).map((p) => ({ key: p.key, label: p.label, url: links[p.key as keyof PlatformLinks]! }))
}

export default async function SmartlinkPage({ params }: SmartlinkPageProps) {
  const { slug } = await params
  const track = await getReleasedSmartlinkTrack(slug)
  if (!track) notFound()

  const coverUrl = smartlinkOgImagePath(slug)
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
