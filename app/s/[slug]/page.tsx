import { notFound } from "next/navigation"
import { SmartlinkLanding } from "@/components/smartlink/smartlink-landing"
import { SmartlinkTrackRoot } from "@/components/smartlink/smartlink-track-root"
import { getPublicSmartlink, smartlinkOgImagePath } from "@/lib/smartlink"
import { getSiteOrigin } from "@/lib/smartlink-public-origin"
import { getOrderedSmartlinkLinks } from "@/lib/smartlink-theme"

interface SmartlinkPageProps {
  params: Promise<{ slug: string }>
}

export default async function SmartlinkPage({ params }: SmartlinkPageProps) {
  const { slug } = await params
  const pub = await getPublicSmartlink(slug)
  if (!pub) notFound()

  const coverUrl = smartlinkOgImagePath(slug)
  const linksList = getOrderedSmartlinkLinks(pub.platformLinks, pub.theme)

  const previewAudioSrc =
    pub.theme.previewAudioEnabled && pub.audioPath?.trim()
      ? `/api/smartlink/${encodeURIComponent(slug)}/audio`
      : null

  const brandParams = new URLSearchParams({
    utm_source: "smartlink",
    utm_medium: "brand",
    utm_campaign: pub.slug,
  })
  const brandHref = `${getSiteOrigin()}/?${brandParams.toString()}`

  return (
    <SmartlinkTrackRoot slug={pub.slug}>
      <SmartlinkLanding
        title={pub.title}
        artist={pub.artistName}
        coverUrl={coverUrl}
        links={linksList}
        theme={pub.theme}
        previewAudioSrc={previewAudioSrc}
        brandHref={brandHref}
      />
    </SmartlinkTrackRoot>
  )
}
