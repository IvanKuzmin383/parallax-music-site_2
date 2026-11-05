import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ErrorBoundary } from "@/components/error-boundary"
import { ProductLanding } from "@/components/marketing/product-landing"
import { getToolProductPage, TOOLS_PRODUCT_PAGES } from "@/lib/marketing/public-catalog"

type PageProps = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return TOOLS_PRODUCT_PAGES.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const product = getToolProductPage(slug)
  if (!product) return {}
  return {
    title: product.seoTitle,
    description: product.seoDescription,
    keywords: product.keywords,
    alternates: { canonical: product.href },
  }
}

export default async function ToolProductPage({ params }: PageProps) {
  const { slug } = await params
  const product = getToolProductPage(slug)
  if (!product) notFound()

  return (
    <ErrorBoundary>
      <ProductLanding product={product} />
    </ErrorBoundary>
  )
}
