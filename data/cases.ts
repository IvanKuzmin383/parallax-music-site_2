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

export const caseStudies: CaseStudyMeta[] = [
  {
    slug: "nova-wave",
    title: "Nova Wave - рост с 800 до 45 000 прослушиваний",
    excerpt:
      "Дистрибуция, питчинг и визуальный контент: как indie pop-сингл вышел на editorial-плейлисты за 6 месяцев.",
    metaDescription:
      "Кейс Parallax Music: indie pop-сингл Nova Wave вырос с 800 до 45 000 прослушиваний за 6 месяцев - дистрибуция, питчинг Spotify и Яндекс Музыки, editorial-плейлисты.",
    keywords: [
      "продвижение indie pop",
      "питчинг Spotify",
      "editorial плейлисты",
      "дистрибуция музыки",
      "Parallax Music кейс",
      "продвижение релиза",
    ],
    coverImage: "/hero-studio.webp",
    artistName: "Nova Wave",
    genre: "Indie pop",
    services: ["Дистрибуция", "Питчинг", "Spotify Canvas"],
    featured: true,
    sortOrder: 1,
    updatedAt: "2026-06-01",
  },
  {
    slug: "where-mountains-dream",
    title: "Дмитрий Крюков - продвижение оркестрового релиза",
    excerpt:
      "VK Ads, Яндекс Директ и BandLink: как авторское оркестровое произведение вышло на массовую аудиторию за неделю рекламы.",
    metaDescription:
      "Кейс продвижения оркестрового релиза «Where the Mountains Dream»: VK Ads, Яндекс Директ, BandLink - 8 355 кликов, 302 слушателя VK Музыки, тест эмоциональных креативов.",
    keywords: [
      "продвижение оркестровой музыки",
      "VK Ads музыка",
      "Яндекс Директ релиз",
      "BandLink",
      "таргет VK",
      "Parallax Music кейс",
      "продвижение релиза",
    ],
    coverImage: "/hero-studio.webp",
    artistName: "Дмитрий Крюков",
    genre: "Оркестровая / cinematic",
    services: ["VK Ads", "Яндекс Директ", "BandLink"],
    featured: true,
    sortOrder: 2,
    updatedAt: "2026-06-06",
  },
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
