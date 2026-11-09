import { PROMOTION_SEO } from "@/lib/promotion-pages"

/**
 * Публичные страницы услуг. Контент - тот же компонент, что и в кабинете (public mode),
 * поэтому одна услуга = один публичный URL + одна страница в кабинете.
 */
export const FEATURE_LANDING_SLUGS = [
  "ai-covers",
  "video-shots",
  "vertical-videos",
  "lyrics-sync",
  "ai-mastering",
] as const

export const PROMOTION_LANDING_SLUGS = [
  "vk-ads",
  "yandex-direct",
  "tiktok-shorts",
  "yandex-playlists",
  "radio",
] as const

export type FeatureLandingSlug = (typeof FEATURE_LANDING_SLUGS)[number]
export type PromotionLandingSlug = (typeof PROMOTION_LANDING_SLUGS)[number]
export type PublicLandingKey = FeatureLandingSlug | PromotionLandingSlug

export type PublicLanding = {
  path: string
  cabinetPath: string
  title: string
  description: string
}

export const PUBLIC_LANDINGS: Record<PublicLandingKey, PublicLanding> = {
  "ai-covers": {
    path: "/features/ai-covers",
    cabinetPath: "/cabinet/design/covers",
    title: "AI-обложка для релиза - 6-9 вариантов, финал 3000 x 3000 | Parallax Music",
    description:
      "Подготовим 6-9 AI-вариантов обложки по материалам релиза. Выберите один - доведём до финального файла 3000 x 3000 для стримингов. 500 ₽.",
  },
  "video-shots": {
    path: "/features/video-shots",
    cabinetPath: "/cabinet/design/video-shots",
    title: "Видеошот в Яндекс Музыке - загрузка и создание | Parallax Music",
    description:
      "Живая анимация вместо статичной обложки в Яндекс Музыке. Загрузим ваш готовый ролик или создадим видеошот под трек.",
  },
  "vertical-videos": {
    path: "/features/vertical-videos",
    cabinetPath: "/cabinet/design/vertical-videos",
    title: "Вертикальные видео под трек для Reels, Shorts и TikTok | Parallax Music",
    description:
      "Монтаж вертикальных роликов под ваш трек из готового видеоряда для публикации в соцсетях. Цена зависит от количества видео.",
  },
  "lyrics-sync": {
    path: "/features/lyrics-sync",
    cabinetPath: "/cabinet/design/lyrics-sync",
    title: "Синхронизация текста песни - только VK Музыка и Apple Music | Parallax Music",
    description:
      "Свяжем строки текста с вокалом для VK Музыки и Apple Music. На этих площадках слова появляются в нужный момент прослушивания.",
  },
  "ai-mastering": {
    path: "/features/ai-mastering",
    cabinetPath: "/cabinet/design/mastering",
    title: "AI-мастеринг трека - послушайте до и после | Parallax Music",
    description:
      "AI-мастеринг WAV для стримингов. Сравните пример до и после, загрузите трек в кабинете и получите готовый мастер.",
  },
  "vk-ads": {
    path: "/promotion/vk-ads",
    cabinetPath: "/cabinet/promotion/vk",
    title: PROMOTION_SEO["vk-ads"].title,
    description: PROMOTION_SEO["vk-ads"].description,
  },
  "yandex-direct": {
    path: "/promotion/yandex-direct",
    cabinetPath: "/cabinet/promotion/yandex",
    title: PROMOTION_SEO["yandex-direct"].title,
    description: PROMOTION_SEO["yandex-direct"].description,
  },
  "tiktok-shorts": {
    path: "/promotion/tiktok-shorts",
    cabinetPath: "/cabinet/promotion/tiktok",
    title: PROMOTION_SEO["tiktok-shorts"].title,
    description: PROMOTION_SEO["tiktok-shorts"].description,
  },
  "yandex-playlists": {
    path: "/promotion/yandex-playlists",
    cabinetPath: "/cabinet/promotion/playlists",
    title: PROMOTION_SEO["yandex-playlists"].title,
    description: PROMOTION_SEO["yandex-playlists"].description,
  },
  radio: {
    path: "/promotion/radio",
    cabinetPath: "/cabinet/promotion/radio",
    title: "Размещение трека в радио-витрине Parallax Music",
    description:
      "Ещё одна точка знакомства с вашей музыкой: подготовим материалы и разместим трек в радио-витрине Parallax Music.",
  },
}

/** Бесплатный SEO-инструмент с рабочим редактором (не услуга из /features). */
export const SLOWED_REVERB_PUBLIC: PublicLanding = {
  path: "/tools/slowed-reverb",
  cabinetPath: "/cabinet/tools/slowed-reverb",
  title: "Создать Slowed / Reverb / Nightcore онлайн бесплатно | Parallax Music",
  description:
    "Бесплатный Slowed Reverb Nightcore maker в браузере: загрузите трек, выберите пресет, скачайте WAV. Без регистрации - файл не хранится на сервере. Потом можно выпустить версию на стриминги.",
}

export function isFeatureLandingSlug(value: string): value is FeatureLandingSlug {
  return (FEATURE_LANDING_SLUGS as readonly string[]).includes(value)
}

export function isPromotionLandingSlug(value: string): value is PromotionLandingSlug {
  return (PROMOTION_LANDING_SLUGS as readonly string[]).includes(value)
}

/** Публичная страница услуги по её пути в кабинете (для каталога и ссылок с главной). */
export function publicPathForCabinetPath(cabinetPath: string): string | null {
  if (cabinetPath === SLOWED_REVERB_PUBLIC.cabinetPath) return SLOWED_REVERB_PUBLIC.path
  for (const landing of Object.values(PUBLIC_LANDINGS)) {
    if (landing.cabinetPath === cabinetPath) return landing.path
  }
  return null
}
