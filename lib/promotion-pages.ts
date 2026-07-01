export const PROMOTION_SLUGS = [
  "first-listeners",
  "yandex-playlists",
  "vk-ads",
  "yandex-direct",
  "tiktok-shorts",
] as const

export type PromotionSlug = (typeof PROMOTION_SLUGS)[number]

export function isPromotionSlug(value: string): value is PromotionSlug {
  return (PROMOTION_SLUGS as readonly string[]).includes(value)
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

export type PromotionSeo = {
  title: string
  description: string
  keywords: string[]
}

export const PROMOTION_SEO: Record<"hub" | PromotionSlug, PromotionSeo> = {
  hub: {
    title: "Продвижение музыки для артистов — плейлисты, реклама, TikTok | Parallax Music",
    description:
      "Продвигаем релизы артистов: размещение в плейлистах Яндекс Музыки, VK Реклама, Яндекс Директ, TikTok и Shorts. Реальные прослушивания и рост аудитории.",
    keywords: [
      "продвижение музыки",
      "продвижение релиза",
      "музыкальный маркетинг",
      "Parallax Music",
      "продвижение артиста",
    ],
  },
  "first-listeners": {
    title: "Продвижение трека — привлечь первых слушателей | Parallax Music",
    description:
      "Вышел трек, а слушателей нет? Размещаем в плейлистах, запускаем рекламу и привлекаем реальную аудиторию. Быстрый старт продвижения релиза.",
    keywords: [
      "продвижение трека",
      "первые слушатели",
      "прослушивания",
      "продвижение релиза",
      "Parallax Music",
    ],
  },
  "yandex-playlists": {
    title: "Размещение в плейлистах Яндекс Музыки — продвижение релиза | Parallax Music",
    description:
      "Быстрый запуск размещения трека в плейлистах Яндекс Музыки. Первые прослушивания после размещения, бессрочное размещение в своих и партнёрских плейлистах.",
    keywords: [
      "плейлисты Яндекс Музыки",
      "размещение в плейлистах",
      "продвижение Яндекс Музыка",
      "прослушивания",
      "Parallax Music",
    ],
  },
  "vk-ads": {
    title: "Продвижение в VK Реклама и VK Музыка — рост слушателей | Parallax Music",
    description:
      "Точный таргетинг, AI-креативы и аналитика кампаний. Привлекаем новую аудиторию во ВКонтакте и увеличиваем прослушивания релиза.",
    keywords: [
      "VK Реклама",
      "продвижение VK Музыка",
      "реклама музыки ВКонтакте",
      "таргетинг музыка",
      "Parallax Music",
    ],
  },
  "yandex-direct": {
    title: "Продвижение в Яндекс Директ — реклама музыки и релизов | Parallax Music",
    description:
      "Точная реклама под ваши цели: трек, концерт, мерч или соцсети. Индивидуальная настройка, таргетинг и ежедневная оптимизация кампании.",
    keywords: [
      "Яндекс Директ музыка",
      "реклама релиза",
      "продвижение трека",
      "таргетированная реклама",
      "Parallax Music",
    ],
  },
  "tiktok-shorts": {
    title: "TikTok и Shorts продвижение музыки — вирусный охват | Parallax Music",
    description:
      "Вертикальные видео для TikTok, Reels и YouTube Shorts. Рост узнаваемости артиста, новая аудитория за пределами стримингов и вирусный потенциал.",
    keywords: [
      "TikTok продвижение музыки",
      "YouTube Shorts музыка",
      "вертикальное видео",
      "вирусный охват",
      "Parallax Music",
    ],
  },
}

export function promotionCanonical(path: string): string {
  return path.startsWith("/") ? path : `/${path}`
}

export function promotionOgUrl(path: string): string {
  const canonical = promotionCanonical(path)
  return `${siteUrl}${canonical}`
}
