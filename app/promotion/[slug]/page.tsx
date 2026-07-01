import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { PromotionServiceLanding } from "@/components/promotion-service-landing"
import { buildPromotionMetadata } from "@/lib/promotion-metadata"
import { isPromotionSlug, PROMOTION_SLUGS, PROMOTION_SEO } from "@/lib/promotion-pages"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

type PageProps = {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return PROMOTION_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (!isPromotionSlug(slug)) {
    return {}
  }
  return buildPromotionMetadata(`/promotion/${slug}`, slug)
}

export default async function PromotionServicePage({ params }: PageProps) {
  const { slug } = await params
  if (!isPromotionSlug(slug)) {
    notFound()
  }

  const seo = PROMOTION_SEO[slug]

  const serviceLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: seo.title,
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
      {
        "@type": "ListItem",
        position: 3,
        name: seo.title.split("|")[0].trim(),
        item: `${siteUrl}/promotion/${slug}`,
      },
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
      <main id="main-content" className="min-h-screen bg-background">
        <PromotionServiceLanding slug={slug} />
      </main>
    </ErrorBoundary>
  )
}
