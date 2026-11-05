import { MetadataRoute } from 'next'
import { getPublishedArticles } from '@/lib/articles'
import { getAllCaseStudies } from '@/data/cases'
import { PROMOTION_SLUGS } from '@/lib/promotion-pages'
import { PUBLIC_SERVICE_SLUGS, TOOLS_PRODUCT_PAGES } from '@/lib/marketing/public-catalog'

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
    '/tools',
    '/services',
    '/pricing',
    '/promotion',
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }))

  const toolUrls = TOOLS_PRODUCT_PAGES.map((p) => ({
    url: `${baseUrl}${p.href}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }))

  const serviceUrls = PUBLIC_SERVICE_SLUGS.map((slug) => ({
    url: `${baseUrl}/services/${slug}`,
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
    ...toolUrls,
    ...serviceUrls,
    ...PROMOTION_SLUGS.map((slug) => ({
      url: `${baseUrl}/promotion/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.85,
    })),
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

