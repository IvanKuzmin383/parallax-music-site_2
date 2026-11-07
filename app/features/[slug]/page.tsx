import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { PublicLandingView } from "@/components/marketing/public-landing-view"
import { isFeatureLandingSlug, PUBLIC_LANDINGS } from "@/lib/marketing/public-landings"

/** Лендинги читают searchParams (возврат с оплаты в кабинете) - без dynamic контент не попал бы в SSR. */
export const dynamic = "force-dynamic"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (!isFeatureLandingSlug(slug)) return {}
  const landing = PUBLIC_LANDINGS[slug]
  return {
    title: { absolute: landing.title },
    description: landing.description,
    alternates: { canonical: landing.path },
    openGraph: {
      type: "website",
      url: `${siteUrl}${landing.path}`,
      title: landing.title,
      description: landing.description,
    },
  }
}

export default async function FeaturePage({ params }: PageProps) {
  const { slug } = await params
  if (!isFeatureLandingSlug(slug)) notFound()
  const landing = PUBLIC_LANDINGS[slug]

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Возможности", item: `${siteUrl}/features` },
      {
        "@type": "ListItem",
        position: 3,
        name: landing.title.split("|")[0].trim(),
        item: `${siteUrl}${landing.path}`,
      },
    ],
  }

  return (
    <ErrorBoundary>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <main id="main-content" className="min-h-screen">
        <PublicLandingView landing={slug} />
      </main>
    </ErrorBoundary>
  )
}
