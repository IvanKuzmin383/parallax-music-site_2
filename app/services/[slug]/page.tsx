import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { ProductLanding } from "@/components/marketing/product-landing"
import {
  getPublicServiceEntry,
  isPublicServiceSlug,
  PUBLIC_SERVICE_SLUGS,
  type MarketingProductPage,
} from "@/lib/marketing/public-catalog"

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return PUBLIC_SERVICE_SLUGS.map((slug) => ({ slug }))
}

function toProductPage(slug: string): MarketingProductPage | undefined {
  const service = getPublicServiceEntry(slug)
  if (!service) return undefined
  return {
    slug: service.slug,
    href: `/services/${service.slug}`,
    cabinetHref: service.href,
    title: service.title,
    subtitle: service.shortDescription,
    priceLabel: service.pricePrefix
      ? `${service.pricePrefix}${service.priceLabel}`
      : service.priceLabel,
    features: service.features,
    steps: service.steps,
    faq: service.faq,
    ctaLabel: service.comingSoon ? "Скоро в кабинете" : "Заказать в кабинете",
    seoTitle: `${service.title} | Parallax Music`,
    seoDescription: service.shortDescription,
    keywords: [service.title, "Parallax Music", "услуги для артистов"],
    hub: "services",
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  if (!isPublicServiceSlug(slug)) return {}
  const product = toProductPage(slug)
  if (!product) return {}
  return {
    title: product.seoTitle,
    description: product.seoDescription,
    keywords: product.keywords,
    alternates: { canonical: product.href },
  }
}

export default async function ServiceProductPage({ params }: PageProps) {
  const { slug } = await params
  if (!isPublicServiceSlug(slug)) notFound()
  const product = toProductPage(slug)
  if (!product) notFound()

  return (
    <ErrorBoundary>
      <ProductLanding product={product} />
    </ErrorBoundary>
  )
}
