import { MetadataRoute } from 'next'
import { getPublishedArticles } from '@/lib/articles'
import { getAllCaseStudies } from '@/data/cases'
import { PROMOTION_SLUGS } from '@/lib/promotion-pages'
import { PUBLIC_LANDINGS } from '@/lib/marketing/public-landings'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://parallaxmusic.ru'
  
  const articles = await getPublishedArticles()
  const cases = getAllCaseStudies()
  
  const articleUrls = articles.map((article) => ({
    url: `${baseUrl}/blog/${article.slug}`,
    lastModified: new Date(article.updatedAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const caseUrls = cases.map((c) => ({
    url: `${baseUrl}/cases/${c.slug}`,
    lastModified: c.updatedAt ? new Date(c.updatedAt) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }))

  const hubUrls = [
    '/distribution',
    '/features',
    '/pricing',
    '/promotion',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }))

  const landingPaths = new Set([
    ...PROMOTION_SLUGS.map((slug) => `/promotion/${slug}`),
    ...Object.values(PUBLIC_LANDINGS).map((landing) => landing.path),
  ])
  const landingUrls = [...landingPaths].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/stihi`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    ...hubUrls,
    ...landingUrls,
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/cases`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/offer`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/offer/playlist`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/personal-data-consent`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    ...articleUrls,
    ...caseUrls,
  ]
}

