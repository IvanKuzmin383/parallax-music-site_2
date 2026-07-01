import type { Metadata } from "next"
import { ErrorBoundary } from "@/components/error-boundary"
import { PromotionHubLanding } from "@/components/promotion-hub-landing"
import { buildPromotionMetadata } from "@/lib/promotion-metadata"
import { PROMOTION_SEO } from "@/lib/promotion-pages"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

export const metadata: Metadata = buildPromotionMetadata("/promotion", "hub")

export default function PromotionHubPage() {
  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "Продвижение музыки для артистов",
    provider: {
      "@type": "Organization",
      name: "Parallax Music",
      url: siteUrl,
    },
    areaServed: "RU",
    description: PROMOTION_SEO.hub.description,
    url: `${siteUrl}/promotion`,
    serviceType: "Music promotion",
  }

  return (
    <ErrorBoundary>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <main id="main-content" className="min-h-screen bg-background">
        <PromotionHubLanding />
      </main>
    </ErrorBoundary>
  )
}
