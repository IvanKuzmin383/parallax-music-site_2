import type { Metadata } from "next"
import {
  PROMOTION_SEO,
  promotionOgUrl,
  type PromotionSlug,
} from "@/lib/promotion-pages"

export function buildPromotionMetadata(path: string, key: "hub" | PromotionSlug): Metadata {
  const seo = PROMOTION_SEO[key]
  const url = promotionOgUrl(path)

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: path,
      languages: {
        ru: url,
        en: url,
        "x-default": url,
      },
    },
    openGraph: {
      type: "website",
      url,
      title: seo.title,
      description: seo.description,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  }
}
