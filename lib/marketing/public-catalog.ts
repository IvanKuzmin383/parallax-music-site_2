import { TRACK_COVER_PRICE_RUB } from "@/lib/track-cover-pricing"
import { TOOLS_MASTERING_DOWNLOAD_PRICE_RUB } from "@/lib/tools-mastering-pricing"
import { TOOLS_SLOWED_REVERB_DOWNLOAD_PRICE_RUB } from "@/lib/tools-slowed-reverb-pricing"
import { TOOLS_SMARTLINK_PRICE_RUB } from "@/lib/tools-smartlink-pricing"
import { TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB } from "@/lib/tools-story-video-pricing"
import { VERTICAL_VIDEO_PRICE_TIER_3_RUB } from "@/lib/vertical-video-pricing"
import { getVisibleServicesCatalog, type ServiceCatalogEntry } from "@/lib/cabinet/services-catalog"

export type MarketingProductPage = {
  slug: string
  href: string
  cabinetHref: string
  title: string
  titleHighlight?: string
  subtitle: string
  priceLabel: string
  priceNote?: string
  features: string[]
  steps: string[]
  faq: Array<{ q: string; a: string }>
  ctaLabel: string
  seoTitle: string
  seoDescription: string
  keywords: string[]
  hub: "tools" | "services"
}

const formatRub = (n: number) => `${n.toLocaleString("ru-RU")} ₽`

/** Self-serve tools sold on the public site. */
export const TOOLS_PRODUCT_PAGES: MarketingProductPage[] = [
  {
    slug: "smartlinks",
    href: "/tools/smartlinks",
    cabinetHref: "/cabinet/tools/smartlinks",
    title: "Смартлинк",
    titleHighlight: "одна ссылка на все площадки",
    subtitle:
      "Страница с обложкой, превью и кнопками Spotify, Apple Music, VK и других сервисов. Для релиза, пресейва и промо - с дистрибуцией у нас или без.",
    priceLabel: `от ${formatRub(TOOLS_SMARTLINK_PRICE_RUB)} / год`,
    features: [
      "Темы оформления, свои цвета и соцсети",
      "Обложка и короткий превью-аудио",
      "Промо-смартлинк до официального релиза",
      "Подходит артистам без нашей дистрибуции",
    ],
    steps: [
      "Создайте кабинет и откройте Инструменты → Смартлинки",
      "Загрузите обложку, добавьте ссылки на площадки",
      "Опубликуйте страницу и делитесь одной ссылкой",
    ],
    faq: [
      {
        q: "Нужна ли дистрибуция Parallax?",
        a: "Нет. Смартлинк можно создать отдельно - для любого релиза на площадках.",
      },
      {
        q: "Сколько действует оплата?",
        a: "Год публикации страницы после активации.",
      },
    ],
    ctaLabel: "Создать смартлинк",
    seoTitle: "Смартлинки - одна ссылка на все площадки | Parallax Music",
    seoDescription:
      "Создайте страницу со ссылками на Spotify, Apple Music, VK и другие сервисы. Для артистов с дистрибуцией и без.",
    keywords: ["смартлинк", "smartlink", "ссылка на площадки", "Parallax Music"],
    hub: "tools",
  },
  {
    slug: "mastering",
    href: "/tools/mastering",
    cabinetHref: "/cabinet/tools/mastering",
    title: "Онлайн-мастеринг",
    titleHighlight: "готово за минуты",
    subtitle:
      "Пресеты и ручные параметры для трека. Первое скачивание бесплатно - дальше оплата за файл.",
    priceLabel: `1 бесплатно, далее ${formatRub(TOOLS_MASTERING_DOWNLOAD_PRICE_RUB)}`,
    priceNote: "Первое скачивание в кабинете бесплатно",
    features: [
      "Пресеты под разные жанры",
      "Настройка громкости и характера",
      "Скачивание готового файла",
      "Без студии и долгого ожидания",
    ],
    steps: [
      "Откройте Инструменты → Онлайн-мастеринг в кабинете",
      "Загрузите трек и выберите пресет или параметры",
      "Скачайте результат - первое скачивание бесплатно",
    ],
    faq: [
      {
        q: "Это замена студийному мастерингу?",
        a: "Это быстрый онлайн-инструмент для черновика и релиза. Для сложных задач есть AI-мастеринг как услуга.",
      },
    ],
    ctaLabel: "Открыть мастеринг",
    seoTitle: "Онлайн-мастеринг трека | Parallax Music",
    seoDescription:
      "Мастеринг трека онлайн: пресеты, параметры и скачивание. Первое скачивание бесплатно.",
    keywords: ["мастеринг онлайн", "мастеринг трека", "Parallax Music"],
    hub: "tools",
  },
  {
    slug: "slowed-reverb",
    href: "/tools/slowed-reverb",
    cabinetHref: "/cabinet/tools/slowed-reverb",
    title: "Slowed / Reverb / Nightcore",
    titleHighlight: "версии под контент",
    subtitle:
      "Скорость, басы, реверб и пресеты для Reels, TikTok и Shorts. Первое скачивание бесплатно.",
    priceLabel: `1 бесплатно, далее ${formatRub(TOOLS_SLOWED_REVERB_DOWNLOAD_PRICE_RUB)}`,
    priceNote: "Первое скачивание в кабинете бесплатно",
    features: [
      "Пресеты Slowed, Reverb, Nightcore",
      "Ручная скорость и эффекты",
      "Быстрый экспорт под соцсети",
      "Удобно для сниппетов и трендов",
    ],
    steps: [
      "Откройте инструмент в кабинете",
      "Загрузите трек и выберите пресет",
      "Скачайте версию для контента",
    ],
    faq: [
      {
        q: "Можно ли выпускать такие версии на стриминги?",
        a: "Инструмент для контента и черновиков. Для релиза на площадках соблюдайте правила прав и площадок.",
      },
    ],
    ctaLabel: "Открыть инструмент",
    seoTitle: "Slowed Reverb Nightcore онлайн | Parallax Music",
    seoDescription:
      "Сделайте Slowed, Reverb или Nightcore версию трека онлайн. Первое скачивание бесплатно.",
    keywords: ["slowed reverb", "nightcore", "обработка трека", "Parallax Music"],
    hub: "tools",
  },
  {
    slug: "covers",
    href: "/tools/covers",
    cabinetHref: "/cabinet/design/covers",
    title: "AI-обложка",
    titleHighlight: "для релиза",
    subtitle:
      "Несколько вариантов обложки под трек или альбом, согласование финала и готовый файл под площадки.",
    priceLabel: formatRub(TRACK_COVER_PRICE_RUB),
    features: [
      "Несколько вариантов на выбор",
      "Правки до финального файла",
      "Формат под стриминги",
      "Заказ прямо из кабинета",
    ],
    steps: [
      "Откройте Оформление → Обложка в кабинете",
      "Опишите идею и загрузите референсы",
      "Выберите финал и скачайте файл",
    ],
    faq: [
      {
        q: "Подойдёт для ИИ-релизов?",
        a: "Да. Готовим обложку под требования площадок и ваш релиз.",
      },
    ],
    ctaLabel: "Заказать обложку",
    seoTitle: "AI-обложка для трека и релиза | Parallax Music",
    seoDescription:
      `Создание обложки для релиза с AI: несколько вариантов и финальный файл. От ${TRACK_COVER_PRICE_RUB} ₽.`,
    keywords: ["обложка трека", "AI обложка", "cover art", "Parallax Music"],
    hub: "tools",
  },
  {
    slug: "story-video",
    href: "/tools/story-video",
    cabinetHref: "/cabinet/tools/story-video",
    title: "Сниппет",
    titleHighlight: "для Reels и TikTok",
    subtitle:
      "Короткое видео 5-30 сек с обложкой, хуком и шаблонами. Первое скачивание бесплатно, дальше недорого.",
    priceLabel: `1 бесплатно, далее ${formatRub(TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB)}`,
    priceNote: "Первое скачивание в кабинете бесплатно",
    features: [
      "Шаблоны под вертикальный формат",
      "Хук и обложка в одном ролике",
      "Экспорт для Reels / Shorts / TikTok",
      "Быстрый старт без монтажа с нуля",
    ],
    steps: [
      "Откройте Инструменты → Сниппет",
      "Выберите шаблон и отрезок трека",
      "Скачайте ролик и опубликуйте",
    ],
    faq: [
      {
        q: "Нужен монтажёр?",
        a: "Для базового сниппета - нет. Если нужен сток-видеоряд под ключ, закажите вертикальное видео.",
      },
    ],
    ctaLabel: "Сделать сниппет",
    seoTitle: "Сниппет трека для TikTok и Reels | Parallax Music",
    seoDescription:
      "Создайте вертикальный сниппет трека для Reels, Shorts и TikTok. Первое скачивание бесплатно.",
    keywords: ["сниппет трека", "Reels", "TikTok", "Parallax Music"],
    hub: "tools",
  },
]

export const TOOLS_HUB_CARDS = [
  ...TOOLS_PRODUCT_PAGES.map((p) => ({
    id: p.slug,
    title: p.title,
    description: p.subtitle,
    href: p.href,
    priceLabel: p.priceLabel,
    badge: p.priceNote ? "1 бесплатно" : undefined,
  })),
  {
    id: "vertical-videos",
    title: "Вертикальные видео",
    description: "Монтаж со сток-видеорядом под трек - заказ в кабинете.",
    href: "/cabinet/design/vertical-videos",
    priceLabel: `от ${formatRub(VERTICAL_VIDEO_PRICE_TIER_3_RUB)}`,
  },
]

/** Managed services for public /services hub - from cabinet catalog. */
export const PUBLIC_SERVICE_SLUGS = [
  "vk-ads",
  "yandex-ads",
  "playlists",
  "ai-covers",
  "vertical-videos",
  "video-shots",
  "lyrics-sync",
  "ai-mastering",
  "ai-tracks",
] as const

export type PublicServiceSlug = (typeof PUBLIC_SERVICE_SLUGS)[number]

export function isPublicServiceSlug(value: string): value is PublicServiceSlug {
  return (PUBLIC_SERVICE_SLUGS as readonly string[]).includes(value)
}

export function getPublicServiceEntry(slug: string): ServiceCatalogEntry | undefined {
  if (!isPublicServiceSlug(slug)) return undefined
  return getVisibleServicesCatalog().find((s) => s.slug === slug)
}

export function getToolProductPage(slug: string): MarketingProductPage | undefined {
  return TOOLS_PRODUCT_PAGES.find((p) => p.slug === slug)
}

export const DISTRIBUTION_POINTS = [
  {
    title: "50+ площадок",
    description: "Яндекс Музыка, VK, Spotify, Apple Music, TikTok, YouTube и другие.",
  },
  {
    title: "100% роялти",
    description: "Без комиссии с доходов артиста - вы получаете всё, что начислили площадки.",
  },
  {
    title: "Треки не снимаем",
    description: "После окончания подписки релизы остаются на площадках.",
  },
  {
    title: "ИИ-релизы ок",
    description: "Лояльная модерация нейросетевых треков и живая поддержка.",
  },
  {
    title: "Статистика в кабинете",
    description: "Прослушивания и отчёты с основных площадок в одном месте.",
  },
  {
    title: "Вывод роялти",
    description: "Удобный вывод средств и прозрачные транзакции в кабинете.",
  },
]
