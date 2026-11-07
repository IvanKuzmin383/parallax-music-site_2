import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { PromotionServiceLanding } from "@/components/promotion-service-landing"
import { PublicLandingView } from "@/components/marketing/public-landing-view"
import { buildPromotionMetadata } from "@/lib/promotion-metadata"
import { isPromotionSlug, PROMOTION_SEO } from "@/lib/promotion-pages"
import { isPromotionLandingSlug, PUBLIC_LANDINGS } from "@/lib/marketing/public-landings"

/** Лендинги читают searchParams (возврат с оплаты в кабинете) - без dynamic контент не попал бы в SSR. */
export const dynamic = "force-dynamic"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

type PageProps = {
  params: Promise<{ slug: string }>
}

function pageSeo(slug: string): { title: string; description: string } | null {
  if (isPromotionLandingSlug(slug)) return PUBLIC_LANDINGS[slug]
  if (isPromotionSlug(slug)) return PROMOTION_SEO[slug]
  return null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (isPromotionSlug(slug)) return buildPromotionMetadata(`/promotion/${slug}`, slug)
  const seo = pageSeo(slug)
  if (!seo) return {}
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: `/promotion/${slug}` },
    openGraph: {
      type: "website",
      url: `${siteUrl}/promotion/${slug}`,
      title: seo.title,
      description: seo.description,
    },
  }
}

export default async function PromotionServicePage({ params }: PageProps) {
  const { slug } = await params
  const seo = pageSeo(slug)
  if (!seo) notFound()
  const name = seo.title.split("|")[0].trim()

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    provider: {
      "@type": "Organization",
      name: "Parallax Music",
      url: siteUrl,
    },
    areaServed: "RU",
    description: seo.description,
    url: `${siteUrl}/promotion/${slug}`,
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Продвижение", item: `${siteUrl}/promotion` },
      { "@type": "ListItem", position: 3, name, item: `${siteUrl}/promotion/${slug}` },
    ],
  }

  return (
    <ErrorBoundary>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <main id="main-content" className="min-h-screen">
        {isPromotionLandingSlug(slug) ? (
          <PublicLandingView landing={slug} />
        ) : isPromotionSlug(slug) ? (
          <PromotionServiceLanding slug={slug} />
        ) : null}
      </main>
    </ErrorBoundary>
  )
}
