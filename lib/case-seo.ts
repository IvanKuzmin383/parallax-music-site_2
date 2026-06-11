import type { Metadata } from "next"
import type { CaseStudyMeta } from "@/data/cases"

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"
}

export function resolveCaseOgImage(coverImage: string, siteUrl = getSiteUrl()): string {
  if (coverImage.startsWith("http://") || coverImage.startsWith("https://")) {
    return coverImage
  }
  return `${siteUrl}${coverImage.startsWith("/") ? coverImage : `/${coverImage}`}`
}

export function getCaseDescription(caseMeta: CaseStudyMeta): string {
  return caseMeta.metaDescription ?? caseMeta.excerpt
}

export function buildCaseStudyMetadata(slug: string, caseMeta: CaseStudyMeta): Metadata {
  const siteUrl = getSiteUrl()
  const description = getCaseDescription(caseMeta)
  const ogImage = resolveCaseOgImage(caseMeta.coverImage, siteUrl)
  const pageUrl = `${siteUrl}/cases/${slug}`

  return {
    title: caseMeta.title,
    description,
    keywords: caseMeta.keywords,
    alternates: {
      canonical: `/cases/${slug}`,
    },
    openGraph: {
      title: caseMeta.title,
      description,
      url: pageUrl,
      images: [{ url: ogImage, width: 1200, height: 630, alt: caseMeta.title }],
      type: "article",
      publishedTime: caseMeta.updatedAt,
      modifiedTime: caseMeta.updatedAt,
      authors: ["Parallax Music"],
      tags: caseMeta.services,
    },
    twitter: {
      card: "summary_large_image",
      title: caseMeta.title,
      description,
      images: [ogImage],
    },
  }
}

export function buildCaseStudyArticleJsonLd(slug: string, caseMeta: CaseStudyMeta) {
  const siteUrl = getSiteUrl()
  const description = getCaseDescription(caseMeta)
  const ogImage = resolveCaseOgImage(caseMeta.coverImage, siteUrl)

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: caseMeta.title,
    description,
    image: ogImage,
    datePublished: caseMeta.updatedAt,
    dateModified: caseMeta.updatedAt,
    author: {
      "@type": "Organization",
      name: "Parallax Music",
    },
    publisher: {
      "@type": "Organization",
      name: "Parallax Music",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/icon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${siteUrl}/cases/${slug}`,
    },
    keywords: caseMeta.keywords?.join(", "),
    articleSection: "Кейсы",
    about: {
      "@type": "Person",
      name: caseMeta.artistName,
    },
  }
}

export function buildCaseStudyBreadcrumbJsonLd(slug: string, title: string) {
  const siteUrl = getSiteUrl()

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Кейсы", item: `${siteUrl}/cases` },
      { "@type": "ListItem", position: 3, name: title, item: `${siteUrl}/cases/${slug}` },
    ],
  }
}

export const casesListMetadata: Metadata = {
  title: "Кейсы",
  description:
    "Истории успеха артистов Parallax Music: дистрибуция, продвижение релизов, таргет и результаты на стриминговых платформах.",
  keywords: [
    "кейсы музыкального лейбла",
    "продвижение музыки",
    "дистрибуция музыки",
    "Parallax Music кейсы",
    "продвижение релиза",
    "стриминговые площадки",
  ],
  alternates: {
    canonical: "/cases",
  },
  openGraph: {
    title: "Кейсы Parallax Music",
    description:
      "Реальные истории артистов: задачи, решения и измеримые результаты работы с Parallax Music.",
    url: "/cases",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Кейсы Parallax Music",
    description:
      "Реальные истории артистов: задачи, решения и измеримые результаты работы с Parallax Music.",
  },
}
