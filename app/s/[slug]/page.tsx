import { notFound } from "next/navigation"
import { SmartlinkLanding } from "@/components/smartlink/smartlink-landing"
import { getReleasedSmartlinkTrack, smartlinkOgImagePath } from "@/lib/smartlink"
import {
  DEFAULT_SMARTLINK_THEME,
  getOrderedSmartlinkLinks,
  parseSmartlinkTheme,
} from "@/lib/smartlink-theme"

interface SmartlinkPageProps {
  params: Promise<{ slug: string }>
}

export default async function SmartlinkPage({ params }: SmartlinkPageProps) {
  const { slug } = await params
  const track = await getReleasedSmartlinkTrack(slug)
  if (!track) notFound()

  const coverUrl = smartlinkOgImagePath(slug)
  const theme = parseSmartlinkTheme(track.smartlinkTheme ?? DEFAULT_SMARTLINK_THEME)
  const linksList = getOrderedSmartlinkLinks(track.platformLinks, theme)

  const previewAudioSrc =
    theme.previewAudioEnabled && track.audioPath?.trim()
      ? `/api/smartlink/${encodeURIComponent(slug)}/audio`
      : null

  return (
    <SmartlinkLanding
      title={track.trackName}
      artist={track.artistName}
      coverUrl={coverUrl}
      links={linksList}
      theme={theme}
      previewAudioSrc={previewAudioSrc}
    />
  )
}
