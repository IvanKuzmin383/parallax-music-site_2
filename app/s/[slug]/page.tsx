import { notFound } from "next/navigation"
import { SMARTLINK_PLATFORMS } from "@/lib/smartlink-platforms"
import type { PlatformLinks } from "@/lib/smartlink-platforms"
import { getReleasedSmartlinkTrack, smartlinkCoverPath } from "@/lib/smartlink"

interface SmartlinkPageProps {
  params: Promise<{ slug: string }>
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

  const coverUrl = smartlinkCoverPath(slug)
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
