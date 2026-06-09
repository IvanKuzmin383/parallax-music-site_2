/**
 * Реестр кейсов для карточек на главной и /cases.
 *
 * Новый кейс:
 * 1. Добавьте объект в caseStudies ниже
 * 2. Создайте app/cases/{slug}/page.tsx (скопируйте app/cases/_template/page.tsx)
 * 3. Положите картинки в public/cases/{slug}/
 */
export type CaseStudyMeta = {
  slug: string
  title: string
  excerpt: string
  coverImage: string
  artistName: string
  genre?: string
  services?: string[]
  /** Показывать в секции на главной. По умолчанию true */
  featured?: boolean
  /** Меньше — выше в списке */
  sortOrder?: number
  /** Для sitemap (YYYY-MM-DD или ISO) */
  updatedAt?: string
}

export const caseStudies: CaseStudyMeta[] = [
  // Пример (раскомментируйте после создания app/cases/nova-wave/page.tsx):
  // {
  //   slug: "nova-wave",
  //   title: "Nova Wave — рост прослушиваний",
  //   excerpt: "Дистрибуция и питчинг за 6 месяцев",
  //   coverImage: "/cases/nova-wave/cover.webp",
  //   artistName: "Nova Wave",
  //   genre: "Indie pop",
  //   services: ["Дистрибуция", "Питчинг"],
  //   featured: true,
  //   sortOrder: 1,
  //   updatedAt: "2026-06-01",
  // },
]

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
