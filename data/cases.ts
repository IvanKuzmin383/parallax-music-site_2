/**
 * Реестр кейсов для карточек на главной и /cases.
 *
 * Новый кейс:
 * 1. Добавьте объект в caseStudies ниже (title, excerpt, metaDescription, keywords)
 * 2. Создайте app/cases/{slug}/page.tsx (скопируйте app/cases/_template/page.tsx)
 * 3. Положите картинки в public/cases/{slug}/
 */
export type CaseStudyMeta = {
  slug: string
  title: string
  excerpt: string
  /** SEO description (если не задан - используется excerpt) */
  metaDescription?: string
  /** SEO keywords */
  keywords?: string[]
  coverImage: string
  artistName: string
  genre?: string
  services?: string[]
  /** Показывать в секции на главной. По умолчанию true */
  featured?: boolean
  /** Меньше - выше в списке */
  sortOrder?: number
  /** Для sitemap (YYYY-MM-DD или ISO) */
  updatedAt?: string
}

export const caseStudies: CaseStudyMeta[] = []

export function getAllCaseStudies(): CaseStudyMeta[] {
  return [...caseStudies].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
}

export function getFeaturedCaseStudies(limit = 6): CaseStudyMeta[] {
  return getAllCaseStudies()
    .filter((c) => c.featured !== false)
    .slice(0, limit)
}

export function getCaseStudyBySlug(slug: string): CaseStudyMeta | undefined {
  return caseStudies.find((c) => c.slug === slug)
}
