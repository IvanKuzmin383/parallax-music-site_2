import { AI_MASTERING_PRICE_RUB } from "@/lib/ai-mastering-pricing"
import { TRACK_COVER_PRICE_RUB } from "@/lib/track-cover-pricing"
import { VERTICAL_VIDEO_PRICE_TIER_1_RUB } from "@/lib/vertical-video-pricing"
import { YANDEX_VIDEOSHOT_PRICE_RUB } from "@/lib/yandex-videoshot-pricing"
import { YANDEX_VIDEOSHOT_CREATION_PRICE_RUB } from "@/lib/yandex-videoshot-creation-pricing"
import { YANDEX_VIDEOAVATAR_PRICE_RUB } from "@/lib/yandex-videoavatar-pricing"
import { SPOTIFY_VIDEOSHOT_PRICE_RUB } from "@/lib/spotify-videoshot-pricing"
import type { OrderCategory } from "./types"

export interface ServiceCatalogEntry {
  slug: string
  title: string
  shortDescription: string
  priceLabel: string
  category: OrderCategory
  href: string
  features: string[]
  steps: string[]
  requirements: string[]
  faq: { q: string; a: string }[]
  hasBackend: boolean
  paymentEndpoint?: string
  orderType?: string
}

const DEFAULT_STEPS = [
  "Оформите заказ и оплатите услугу",
  "Менеджер свяжется с вами для уточнения деталей",
  "Мы выполняем работу в оговорённые сроки",
  "Вы получаете результат в личном кабинете или на почту",
]

function mockService(
  slug: string,
  title: string,
  shortDescription: string,
  priceLabel: string,
  category: OrderCategory,
  href: string,
  features: string[]
): ServiceCatalogEntry {
  return {
    slug,
    title,
    shortDescription,
    priceLabel,
    category,
    href,
    features,
    steps: DEFAULT_STEPS,
    requirements: ["Название релиза или проекта", "Ссылка на трек (если есть)", "Контакт для связи"],
    faq: [
      { q: "Сколько занимает выполнение?", a: "Срок зависит от услуги — обычно от 3 до 14 рабочих дней." },
      { q: "Можно ли вернуть оплату?", a: "Возврат возможен до начала работы — напишите в поддержку." },
    ],
    hasBackend: false,
  }
}

export const SERVICES_CATALOG: ServiceCatalogEntry[] = [
  mockService(
    "vk-ads",
    "VK Реклама",
    "Настройка таргетированной рекламы во ВКонтакте.",
    "от 5 000 ₽",
    "promotion",
    "/cabinet/promotion/vk",
    ["Аудит релиза", "Настройка кампании", "Отчёт по результатам"]
  ),
  mockService(
    "yandex-ads",
    "Яндекс Реклама",
    "Запуск рекламы через Яндекс РСЯ и Поиск.",
    "от 5 000 ₽",
    "promotion",
    "/cabinet/promotion/yandex",
    ["Подбор площадок", "Настройка объявлений", "Оптимизация бюджета"]
  ),
  mockService(
    "playlists",
    "Плейлисты Яндекс Музыки",
    "Размещение трека в кураторских плейлистах.",
    "от 3 000 ₽",
    "promotion",
    "/cabinet/promotion/playlists",
    ["Подбор плейлистов", "Подача трека", "Отчёт о размещении"]
  ),
  mockService(
    "tiktok",
    "TikTok / Блогеры",
    "Продвижение трека через короткие видео и блогеров.",
    "от 7 000 ₽",
    "promotion",
    "/cabinet/promotion/tiktok",
    ["Подбор форматов", "Координация с блогерами", "Отчёт по охватам"]
  ),
  mockService(
    "radio",
    "Радио",
    "Размещение трека в радио-витрине Parallax Music.",
    "от 2 000 ₽",
    "promotion",
    "/cabinet/promotion/radio",
    ["Подготовка материалов", "Размещение в витрине", "Подтверждение"]
  ),
  mockService(
    "business-music",
    "Музыка для бизнеса",
    "Добавление трека в каталог фоновой музыки для публичных заведений.",
    "от 1 500 ₽",
    "promotion",
    "/cabinet/promotion/business-music",
    ["Проверка прав", "Добавление в каталог", "Уведомление о размещении"]
  ),
  {
    slug: "ai-covers",
    title: "AI Обложки",
    shortDescription: "Создание обложки для релиза с помощью AI в нужном стиле.",
    priceLabel: "от 500 ₽",
    category: "design",
    href: "/cabinet/design/covers",
    features: ["AI-генерация по описанию", "Несколько вариантов", "Формат для площадок"],
    steps: DEFAULT_STEPS,
    requirements: ["Название трека", "Пожелания по стилю", "Контакт для связи"],
    faq: [
      { q: "Сколько вариантов обложки?", a: "Обычно 2–3 варианта на выбор." },
      { q: "Можно ли доработать?", a: "Да, одна итерация правок включена." },
    ],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/ai-cover/create",
    orderType: "ai_cover",
  },
  {
    slug: "vertical-videos",
    title: "Вертикальные видео",
    shortDescription: "Короткие вертикальные ролики для продвижения трека.",
    priceLabel: `от ${VERTICAL_VIDEO_PRICE_TIER_1_RUB} ₽`,
    category: "design",
    href: "/cabinet/design/vertical-videos",
    features: ["Вертикальный формат 9:16", "Под трек", "Для соцсетей"],
    steps: DEFAULT_STEPS,
    requirements: ["Аудио или ссылка на трек", "Пожелания по визуалу", "Контакт"],
    faq: [{ q: "Скидки за объём?", a: "Да, при заказе от 11 и от 51 видео." }],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/vertical-video/create",
    orderType: "vertical_video",
  },
  {
    slug: "video-shots",
    title: "Видеошоты",
    shortDescription: "Видео для клипов/шортсов/соцсетей на основе трека.",
    priceLabel: `от ${YANDEX_VIDEOSHOT_PRICE_RUB} ₽`,
    category: "design",
    href: "/cabinet/design/video-shots",
    features: ["Яндекс Музыка и Spotify", "Формат видеошота", "Быстрый старт"],
    steps: DEFAULT_STEPS,
    requirements: ["Трек", "Обложка", "Контакт"],
    faq: [{ q: "Чем отличаются платформы?", a: "У каждой площадки свой формат — уточним при заказе." }],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/yandex-videoshot/create",
    orderType: "yandex_videoshot",
  },
  {
    slug: "video-avatar",
    title: "Видео-аватар",
    shortDescription: "Визуальный образ артиста для промо и соцсетей.",
    priceLabel: `${YANDEX_VIDEOAVATAR_PRICE_RUB} ₽`,
    category: "design",
    href: "/cabinet/design/video-avatar",
    features: ["Анимированный аватар", "Для Яндекс Музыки", "Промо-материал"],
    steps: DEFAULT_STEPS,
    requirements: ["Фото артиста", "Описание образа", "Контакт"],
    faq: [],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/yandex-videoavatar/create",
    orderType: "yandex_videoavatar",
  },
  {
    slug: "video-shots-publishing",
    title: "Публикация видеошотов",
    shortDescription: "Размещение видеошотов на поддерживаемых площадках.",
    priceLabel: `${YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} ₽`,
    category: "design",
    href: "/cabinet/design/video-shots-publishing",
    features: ["Создание видеошота", "Публикация", "Поддержка формата"],
    steps: DEFAULT_STEPS,
    requirements: ["Трек", "Материалы", "Контакт"],
    faq: [],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/yandex-videoshot-creation/create",
    orderType: "yandex_videoshot_creation",
  },
  {
    slug: "ai-mastering",
    title: "AI Мастеринг",
    shortDescription: "Быстрая обработка фонограммы с помощью AI-инструментов.",
    priceLabel: `${AI_MASTERING_PRICE_RUB} ₽ / трек`,
    category: "design",
    href: "/cabinet/design/mastering",
    features: ["Обработка WAV", "До 50 треков в заказе", "Результат в кабинете"],
    steps: DEFAULT_STEPS,
    requirements: ["WAV-файлы", "Контакт"],
    faq: [{ q: "Какой формат файлов?", a: "WAV, стерео, без клиппинга." }],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/ai-mastering/create",
    orderType: "ai_mastering",
  },
  mockService(
    "ai-tracks",
    "Создание AI-треков",
    "Создание демо, песни или идеи трека с помощью AI.",
    "от 500 ₽",
    "ai",
    "/cabinet/ai/tracks",
    ["Демо или идея", "Текст и мелодия", "Файлы для доработки"]
  ),
  mockService(
    "pitch",
    "Питч для редакторов",
    "Текст для отправки кураторам плейлистов.",
    "от 300 ₽",
    "ai",
    "/cabinet/ai/pitch",
    ["Текст питча", "Адаптация под площадку", "Рекомендации"]
  ),
  mockService(
    "press-release",
    "Пресс-релиз",
    "Готовый текст о релизе для СМИ, соцсетей и промо.",
    "от 500 ₽",
    "ai",
    "/cabinet/ai/press-release",
    ["Текст релиза", "Факты об артисте", "Готовность к публикации"]
  ),
  mockService(
    "deposit",
    "Депонирование",
    "Фиксация даты создания музыки, текста, обложки или фонограммы.",
    "от 1 000 ₽",
    "protect",
    "/cabinet/protect/deposit",
    ["Фиксация даты", "Справка", "Хранение метаданных"]
  ),
  mockService(
    "my-deposits",
    "Мои депозиты",
    "Список ваших депонированных материалов.",
    "—",
    "protect",
    "/cabinet/protect/my-deposits",
    ["История депонирования", "Скачивание справок"]
  ),
]

export const TRACK_COVER_PRICE_LABEL = `${TRACK_COVER_PRICE_RUB} ₽`
export const SPOTIFY_VIDEOSHOT_PRICE_LABEL = `${SPOTIFY_VIDEOSHOT_PRICE_RUB} ₽`

export function getServiceBySlug(slug: string): ServiceCatalogEntry | undefined {
  return SERVICES_CATALOG.find((s) => s.slug === slug)
}

export function getServiceByHref(href: string): ServiceCatalogEntry | undefined {
  return SERVICES_CATALOG.find((s) => s.href === href)
}

export const RECOMMENDED_SERVICE_SLUGS = ["vk-ads", "ai-covers", "playlists", "deposit"] as const

export const QUICK_ACTIONS = [
  { label: "Выпустить трек", href: "/cabinet/upload", description: "Загрузить новый релиз" },
  { label: "Заказать обложку", href: "/cabinet/design/covers", description: "AI обложка для релиза" },
  { label: "Запустить продвижение", href: "/cabinet/promotion/vk", description: "Реклама и промо" },
  { label: "AI-мастеринг", href: "/cabinet/design/mastering", description: "Обработка фонограммы" },
  { label: "Задепонировать", href: "/cabinet/protect/deposit", description: "Защита авторства" },
  { label: "Написать в поддержку", href: "/cabinet/support", description: "Помощь и вопросы" },
] as const
