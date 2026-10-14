import { AI_MASTERING_PRICE_RUB } from "@/lib/ai-mastering-pricing"
import { TRACK_COVER_PRICE_RUB } from "@/lib/track-cover-pricing"
import { VERTICAL_VIDEO_PRICE_TIER_3_RUB } from "@/lib/vertical-video-pricing"
import { YANDEX_VIDEOSHOT_PRICE_RUB } from "@/lib/yandex-videoshot-pricing"
import { YANDEX_VIDEOSHOT_CREATION_PRICE_RUB } from "@/lib/yandex-videoshot-creation-pricing"
import { YANDEX_VIDEOAVATAR_PRICE_RUB } from "@/lib/yandex-videoavatar-pricing"
import { SPOTIFY_VIDEOSHOT_PRICE_RUB } from "@/lib/spotify-videoshot-pricing"
import { MUSIC_VIDEO_PRICE_RUB } from "@/lib/music-video-pricing"
import { RADIO_PRICE_LABEL } from "@/lib/radio-pricing"
import { LYRICS_SYNC_PRICE_LABEL } from "@/lib/lyrics-sync-pricing"
import { VK_ADS_PRICE_LABEL } from "@/lib/vk-ads-campaign"
import { YANDEX_ADS_PRICE_LABEL } from "@/lib/yandex-ads-campaign"
import { PLAYLISTHUB_BASE_PRICE_LABEL } from "@/lib/playlisthub-landing"
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
  /** Кнопка «Оплатить» без списания - заявка интереса (спрос). */
  paymentStub?: boolean
  paymentEndpoint?: string
  orderType?: string
  /** Плашка «Скоро» на карточке и странице услуги. */
  comingSoon?: boolean
  /** Скрыть из пользовательского каталога / поиска (запись нужна для заказов). */
  hiddenFromCatalog?: boolean
  /** Только кнопка интереса без полей заявки. */
  interestOnly?: boolean
  /** Текст CTA для сбора интереса. */
  interestCtaLabel?: string
  /** Подпись поля ссылки в форме заявки (по умолчанию - ссылка на трек). */
  linkFieldLabel?: string
  linkFieldPlaceholder?: string
  linkFieldHint?: string
  linkFieldRequired?: boolean
  /** form-focus: форма слева, без колонки «что входит / как работает». */
  layout?: "default" | "form-focus"
  examples?: Array<{
    platform: "appleMusic" | "yandex" | "vk"
    title: string
    href: string
  }>
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
      { q: "Сколько занимает выполнение?", a: "Срок зависит от услуги - обычно от 3 до 14 рабочих дней." },
      { q: "Можно ли вернуть оплату?", a: "Возврат возможен до начала работы - напишите в поддержку." },
    ],
    hasBackend: false,
  }
}

export const SERVICES_CATALOG: ServiceCatalogEntry[] = [
  {
    slug: "vk-ads",
    title: "Продвижение в VK Музыка",
    shortDescription: "Знакомьте новых слушателей со своей музыкой через VK Рекламу.",
    priceLabel: VK_ADS_PRICE_LABEL,
    category: "promotion",
    href: "/cabinet/promotion/vk",
    features: [
      "Аудитории под вашу музыку",
      "Рекламная подача и креативы",
      "Запуск и корректировки по статистике",
      "Разбор доступных результатов кампании",
    ],
    steps: [
      "Уточняем задачу: ссылка, цель, бюджет и условия в переписке",
      "Готовим материалы, подбираем аудитории и запускаем кампанию",
      "Следим за статистикой, корректируем рекламу и разбираем результаты",
    ],
    requirements: [
      "Название релиза или проекта",
      "Ссылка на трек, сообщество или релиз",
      "Цель кампании",
    ],
    faq: [
      {
        q: "Какой бюджет нужен для старта?",
        a: `Наша работа стоит ${VK_ADS_PRICE_LABEL}. Рекламный бюджет обсуждаем отдельно с учётом задачи и объёма кампании`,
      },
      {
        q: "Где будет показываться реклама?",
        a: "Кампанию запускаем через VK Рекламу. Конкретные форматы и места показов подбираем под задачу и согласованные материалы",
      },
      {
        q: "Будет разбор результатов?",
        a: "Покажем расход и доступные показатели кампании. Для разных задач важны разные показатели, поэтому обсуждаем их перед запуском",
      },
      {
        q: "Вы гарантируете количество прослушиваний?",
        a: "Фиксированное количество не гарантируем. Результат зависит от музыки, подачи, аудитории, бюджета и условий рекламной площадки",
      },
      {
        q: "Как обсудить детали?",
        a: "Укажите ссылку, цель и пожелания в форме. Детали кампании согласуем в переписке.",
      },
    ],
    hasBackend: false,
    paymentStub: true,
    paymentEndpoint: "/api/cabinet/payments/vk-ads/interest",
    interestCtaLabel: "Отправить заявку",
    linkFieldRequired: true,
  },
  {
    slug: "yandex-ads",
    title: "Продвижение в Яндекс Директ",
    shortDescription: "Из рекламы - к вашей музыке. Релиз, концерт, мерч или проект.",
    priceLabel: YANDEX_ADS_PRICE_LABEL,
    category: "promotion",
    href: "/cabinet/promotion/yandex",
    features: [
      "Аудитории и настройки под задачу",
      "Тексты и визуальная подача",
      "Запуск и корректировки по статистике",
      "Разбор доступных показателей",
    ],
    steps: [
      "Уточняем, что продвигаем: ссылка, цель, бюджет и условия в переписке",
      "Готовим объявления, настраиваем кампанию и запускаем материалы",
      "Анализируем статистику, корректируем рекламу и обсуждаем результаты",
    ],
    requirements: [
      "Название релиза / проекта",
      "Ссылка на объект продвижения",
      "Что продвигаем (релиз, концерт, мерч, проект)",
    ],
    faq: [
      {
        q: "Можно продвигать не только трек?",
        a: "Да. Концерт, мерч, сайт или сообщество артиста - выбираем подачу и страницу перехода под вашу задачу",
      },
      {
        q: "Где люди увидят рекламу?",
        a: "В поиске Яндекса и на площадках рекламной сети. Конкретные места показа и форматы подбираем под задачу кампании",
      },
      {
        q: "Как формируется бюджет?",
        a: `Наша работа - ${YANDEX_ADS_PRICE_LABEL}. Рекламный бюджет обсуждаем отдельно. Перед оплатой должны быть понятны точная стоимость и состав заказа`,
      },
      {
        q: "Какие результаты можно оценить?",
        a: "Расход, показы, клики и доступные целевые действия. Возможность отслеживать действия после перехода зависит от страницы назначения и подключённой аналитики",
      },
      {
        q: "Вы гарантируете прослушивания или продажи?",
        a: "Фиксированный результат не гарантируем. Он зависит от проекта, подачи, аудитории, бюджета и страницы, на которую ведёт реклама",
      },
      {
        q: "Как обсудить детали?",
        a: "Укажите ссылку и пожелания в форме. Задачу и условия кампании согласуем в переписке",
      },
    ],
    hasBackend: false,
    paymentStub: true,
    paymentEndpoint: "/api/cabinet/payments/yandex-ads/interest",
    interestCtaLabel: "Отправить заявку",
    linkFieldRequired: true,
  },
  {
    slug: "playlists",
    title: "Размещение в плейлистах Яндекс Музыки",
    shortDescription: "Выберите плейлисты на PlaylistHub - нашем маркетплейсе плейлистов",
    priceLabel: PLAYLISTHUB_BASE_PRICE_LABEL,
    category: "promotion",
    href: "/cabinet/promotion/playlists",
    features: [
      "Выбор плейлистов под звучание трека",
      "Оформление и оплата в PlaylistHub",
      "Статус заказа и ссылки в кабинете сервиса",
      "Скидка за объём: до 210 ₽ при заказе 70+ плейлистов",
    ],
    steps: [
      "Откройте каталог PlaylistHub и выберите плейлисты",
      "Укажите ссылку на трек и оплатите заказ в сервисе",
      "Куратор размещает трек - статус доступен в кабинете",
      "Когда трек добавлен во все плейлисты, заказ выполнен",
    ],
    requirements: [
      "Ссылка на трек (указывается в PlaylistHub)",
      "Аккаунт PlaylistHub для оформления заказа",
    ],
    faq: [
      {
        q: "Где оформить и оплатить размещение?",
        a: "В PlaylistHub - нашем маркетплейсе плейлистов. Перейдите в каталог сервиса, выберите подходящие подборки и оформите заказ там",
      },
      {
        q: "Сколько стоит размещение?",
        a: "Базовая цена - 350 ₽ за плейлист. При большем количестве размещений действуют скидки: до 210 ₽ за плейлист при заказе 70+ плейлистов. Итоговую стоимость выбранных размещений вы увидите в PlaylistHub",
      },
      {
        q: "Это пользовательские плейлисты?",
        a: "Да. На этой странице речь о размещении в пользовательских плейлистах Яндекс Музыки из каталога PlaylistHub",
      },
      {
        q: "Есть гарантированное число прослушиваний?",
        a: "Фиксированное число не обещаем. Результат зависит от трека, выбранных плейлистов и реакции слушателей",
      },
    ],
    hasBackend: false,
  },
  {
    ...mockService(
      "tiktok",
      "TikTok / Блогеры",
      "Продвижение трека через короткие видео и блогеров",
      "от 1 500 ₽",
      "promotion",
      "/cabinet/promotion/tiktok",
      ["Подбор форматов", "Координация с блогерами", "Отчёт по охватам"]
    ),
    steps: [
      "Оставьте заявку с треком, пожеланиями и бюджетом",
      "Согласуем формат, условия размещения и сроки",
      "Координируем работу с блогерами по согласованному формату",
      "Соберём доступные данные о публикациях и охватах",
    ],
    faq: [
      {
        q: "Можно гарантировать просмотры и новых слушателей?",
        a: "Фиксированных гарантий просмотров и переходов в прослушивания нет. Реакция аудитории зависит от трека, ролика и конкретного размещения. Результат оценивается по доступным данным публикаций",
      },
      {
        q: "Что нужно для старта?",
        a: "Название релиза, ссылка на трек, бюджет и пожелания к продвижению. По этим данным обсуждаются формат и условия размещения",
      },
      {
        q: "Сколько занимает размещение?",
        a: "Сроки согласуются для выбранного формата и блогеров. Конкретный срок указывается при оформлении заказа",
      },
    ],
    paymentStub: true,
    paymentEndpoint: "/api/cabinet/payments/tiktok/interest",
    interestCtaLabel: "Отправить заявку",
  },
  {
    ...mockService(
      "radio",
      "Радио",
      "Размещение трека в радио-витрине Parallax Music.",
      RADIO_PRICE_LABEL,
      "promotion",
      "/cabinet/promotion/radio",
      [
        "Подготовка материалов",
        "Размещение в витрине",
        "Подтверждение выполнения",
      ]
    ),
    steps: [
      "Оставьте заявку с названием релиза, ссылкой на трек и пожеланиями",
      "Свяжемся с вами и обсудим условия, стоимость и сроки",
      "Подготовим материалы и разместим трек по согласованным условиям",
      "Сообщим о завершении работы",
    ],
    requirements: [
      "Название релиза или проекта",
      "Ссылку на трек, если она есть",
      "Пожелания к размещению и контакт для связи",
    ],
    faq: [
      {
        q: "Что входит в услугу?",
        a: "Подготовка материалов, размещение трека в радио-витрине Parallax Music и подтверждение выполнения",
      },
      {
        q: "Нужно ли сейчас оплачивать?",
        a: "Сейчас заявка предварительная и оплата не списывается. Мы свяжемся с вами для уточнения деталей",
      },
      {
        q: "Какие сроки размещения?",
        a: "Сроки определяются при согласовании условий по вашему треку. Конкретный срок должен быть указан перед оформлением размещения",
      },
    ],
    paymentStub: true,
    paymentEndpoint: "/api/cabinet/payments/radio/interest",
    interestCtaLabel: "Отправить заявку",
  },
  {
    ...mockService(
      "business-music",
      "Музыка для бизнеса",
      "Размещение в каталоге фоновой музыки (БизнесЗвук): статистика и 0,01 ₽ за прослушивание",
      "5 000 ₽ / трек",
      "promotion",
      "/cabinet/promotion/business-music",
      ["Проверка прав", "Добавление в каталог", "Статистика и начисления роялти"]
    ),
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/business-music/create",
    orderType: "business_music",
    faq: [
      {
        q: "Что именно входит в 5 000 ₽?",
        a: "Проверка прав, добавление одного согласованного трека в каталог БизнесЗвука, статистика прослушиваний и начисления роялти",
      },
      {
        q: "Будут ли мой трек обязательно включать?",
        a: "Услуга предусматривает размещение в каталоге. Количество прослушиваний зависит от фактического использования трека в сервисе; заранее определённого объёма воспроизведений нет",
      },
      {
        q: "Как рассчитываются роялти?",
        a: "По ставке 0,01 ₽ за учитываемое прослушивание. Например, 10 000 прослушиваний соответствуют начислению 100 ₽. Фактическая сумма зависит от использования трека",
      },
      {
        q: "Что подготовить для заявки?",
        a: "Название трека или релиза и ссылку на композицию, если она есть. Менеджер свяжется с вами и уточнит информацию, необходимую для проверки прав и размещения",
      },
      {
        q: "Сколько занимает выполнение?",
        a: "Срок зависит от услуги - обычно от 3 до 14 рабочих дней",
      },
      {
        q: "Можно ли вернуть оплату?",
        a: "Возврат возможен до начала работы - напишите в поддержку",
      },
    ],
  },
  {
    slug: "ai-covers",
    title: "AI Обложки",
    shortDescription:
      "6-9 вариантов обложки по материалам релиза, одна финальная 3000 × 3000 для стримингов",
    priceLabel: "500 ₽",
    category: "design",
    href: "/cabinet/design/covers",
    features: [
      "6-9 вариантов на выбор",
      "Одна согласованная финальная обложка",
      "Готовый файл 3000 × 3000",
    ],
    steps: [
      "Вы присылаете материалы релиза и пожелания",
      "Мы готовим 6-9 вариантов обложки на выбор",
      "Вы выбираете один - мы согласуем оформление",
      "Мы отдаём финал 3000 × 3000 для стримингов",
    ],
    requirements: ["Материалы релиза", "Пожелания (если есть)", "Контакт"],
    faq: [
      {
        q: "Что входит в 500 ₽?",
        a: "6-9 AI-вариантов на выбор, согласование одного выбранного варианта и одна финальная обложка 3000 × 3000 пикселей",
      },
      {
        q: "Можно добавить имя артиста и название релиза?",
        a: "Да. В форме включите галку и заполните оба поля. Стоимость остаётся 500 ₽",
      },
      { q: "Какой размер финала?", a: "3000 × 3000 пикселей" },
    ],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/ai-cover/create",
    orderType: "ai_cover",
  },
  {
    slug: "vertical-videos",
    title: "Вертикальные видео",
    shortDescription:
      "Монтаж коротких вертикальных роликов из готовых общедоступных видео под ваш трек",
    priceLabel: `от ${VERTICAL_VIDEO_PRICE_TIER_3_RUB} ₽`,
    category: "design",
    href: "/cabinet/design/vertical-videos",
    features: [
      "Подбор готовых видео из общедоступных источников",
      "Нарезка и склейка под трек",
      "Готовые ролики для TikTok, Reels и Shorts",
    ],
    steps: [
      "Вы выбираете трек, количество видео и оплачиваете заказ",
      "После оплаты уточняем пожелания и подбираем готовые видео",
      "Монтируем первый пример из фрагментов для согласования",
      "Собираем остальные ролики по согласованному шаблону монтажа",
    ],
    requirements: ["Трек из кабинета", "Количество видео", "Пожелания к видеоряду", "Контакт"],
    faq: [
      {
        q: "Скидки за объём?",
        a: "Да: 1-10 видео - 249 ₽ за ролик, 11-50 - 199 ₽, 51-500 - 149 ₽",
      },
    ],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/vertical-video/create",
    orderType: "vertical_video",
  },
  {
    slug: "music-video",
    title: "Загрузить видеоклип",
    shortDescription:
      "Дистрибуция и монетизация ваших видеоклипов на Apple Music, VK Музыке и Яндекс Музыке",
    priceLabel: `${MUSIC_VIDEO_PRICE_RUB.toLocaleString("ru-RU")} ₽ / клип`,
    category: "design",
    href: "/cabinet/distribution/music-video/upload",
    features: [],
    steps: [],
    requirements: [],
    faq: [
      {
        q: "Сколько занимает публикация?",
        a: "В среднем 5-6 дней",
      },
      {
        q: "На какие площадки доставляется видеоклип?",
        a: "Apple Music, VK Клипы, Яндекс Музыка",
      },
      {
        q: "Доступна ли статистика просмотров?",
        a: "Просмотры видеоклипов на данный момент в кабинете не отображаются. Итоговые показатели поступают в финансовом отчёте",
      },
    ],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/music-video/create",
    orderType: "music_video",
    linkFieldLabel: "Ссылка на файл клипа",
    linkFieldPlaceholder: "https://disk.yandex.ru/...",
    linkFieldHint: "Укажите ссылку, по которой можно скачать клип (Яндекс Диск, Google Drive и т.п.).",
    linkFieldRequired: true,
    layout: "form-focus",
    examples: [
      {
        platform: "appleMusic",
        title: "Открыть клип",
        href: "https://music.apple.com/us/music-video/petal-in-the-pavement/1895421122",
      },
      {
        platform: "yandex",
        title: "Открыть клип",
        href: "https://music.yandex.ru/video?ids=303926&activeIndex=0",
      },
      {
        platform: "vk",
        title: "Открыть клип",
        href: "https://vkvideo.ru/video-4257753_456239883",
      },
    ],
  },
  {
    slug: "video-shots",
    title: "Видеошот в Яндекс Музыке",
    shortDescription: "Загрузим готовый ролик или создадим видеошот под ваш трек",
    priceLabel: `от ${YANDEX_VIDEOSHOT_PRICE_RUB} ₽`,
    category: "design",
    href: "/cabinet/design/video-shots",
    features: [
      `Готовый ролик - ${YANDEX_VIDEOSHOT_PRICE_RUB} ₽`,
      `Создание и публикация - ${YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} ₽`,
      "Мобильный плеер Яндекс Музыки",
    ],
    steps: DEFAULT_STEPS,
    requirements: ["Трек или демо", "Материал или пожелания", "Контакт"],
    faq: [
      {
        q: "Какой вариант выбрать?",
        a: `Если ролик готов - загрузка за ${YANDEX_VIDEOSHOT_PRICE_RUB} ₽. Если нужен видеоряд под трек - создание за ${YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} ₽ с публикацией`,
      },
      {
        q: "Публикация входит в создание?",
        a: `Да. В ${YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} ₽ входят создание, проверка и загрузка одного видеошота`,
      },
    ],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/yandex-videoshot/create",
    orderType: "yandex_videoshot",
  },
  {
    slug: "video-avatar",
    title: "Видео-аватар",
    shortDescription: "Визуальный образ артиста для промо и соцсетей",
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
    title: "Создание видеошота",
    shortDescription: "Создаем видеошот под ваш трек и публикуем его в Яндекс Музыке",
    priceLabel: `${YANDEX_VIDEOSHOT_CREATION_PRICE_RUB.toLocaleString("ru-RU")} ₽ / шт`,
    category: "design",
    href: "/cabinet/design/video-shots-publishing",
    features: [
      "Нарезка из клипа или бэкстейджа",
      "Моушн-дизайн и абстрактная графика",
      "Публикация в Яндекс Музыке",
    ],
    steps: DEFAULT_STEPS,
    requirements: ["Трек", "Материалы (если есть)", "Контакт"],
    faq: [
      {
        q: "Что такое видеошот?",
        a: "Зацикленное вертикальное видео 5-15 секунд для карточки релиза в Яндекс Музыке",
      },
    ],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/yandex-videoshot-creation/create",
    orderType: "yandex_videoshot_creation",
    /** Объединено в карточку video-shots; запись сохранена для заказов и старых ссылок. */
    hiddenFromCatalog: true,
  },
  {
    slug: "ai-mastering",
    title: "AI Мастеринг",
    shortDescription: "Быстрая обработка фонограммы с помощью AI-инструментов",
    priceLabel: `${AI_MASTERING_PRICE_RUB} ₽ / трек`,
    category: "design",
    href: "/cabinet/design/mastering",
    features: ["Обработка WAV", "До 50 треков в заказе", "Результат в кабинете"],
    steps: DEFAULT_STEPS,
    requirements: ["WAV-файлы", "Контакт"],
    faq: [{ q: "Какой формат файлов?", a: "WAV, стерео, без клиппинга" }],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/ai-mastering/create",
    orderType: "ai_mastering",
  },
  {
    slug: "lyrics-sync",
    title: "Синхронизация текста",
    shortDescription:
      "Строки текста привязаны к моментам исполнения в вашей финальной записи",
    priceLabel: `${LYRICS_SYNC_PRICE_LABEL} / трек`,
    category: "design",
    href: "/cabinet/design/lyrics-sync",
    features: [
      "Разметка строк по времени",
      "Проверка по аудиозаписи",
      "Подготовка к размещению",
    ],
    steps: [
      "Пришлите финальную аудиозапись и полный текст в порядке исполнения",
      "Сопоставим строки с вокалом и проверим разметку по записи",
      "Подготовим синхронизированный текст для дальнейшего размещения",
    ],
    requirements: [
      "Финальная аудиозапись в релизе",
      "Полный текст песни в карточке трека",
    ],
    faq: [
      {
        q: "Как заказать?",
        a: "Отметьте услугу в дополнительных услугах при загрузке релиза и оплатите вместе с релизом",
      },
      {
        q: "Чем отличается синхронизированный текст?",
        a: "Строки привязаны к моментам исполнения. Плеер с поддержкой этой функции выделяет нужную строку по мере звучания песни",
      },
      {
        q: "Нужно прислать готовый текст?",
        a: "Да. Укажите полный текст песни в порядке исполнения в карточке трека при загрузке релиза",
      },
      {
        q: "Почему нужна финальная версия трека?",
        a: "Разметка связана со временем в конкретной записи. Другая длительность, вступление или структура песни могут потребовать новой синхронизации",
      },
      {
        q: "Что делать с повторяющимся припевом?",
        a: "Приведите его текст каждый раз, когда он звучит, чтобы последовательность строк соответствовала записи",
      },
    ],
    /** Оформление только как доп. услуга при загрузке релиза; страница - описание. */
    hasBackend: false,
    orderType: "lyrics_sync",
  },
  {
    slug: "ai-tracks",
    title: "Генерация музыки",
    shortDescription:
      "Создавайте песни с вокалом и инструментальную музыку по своей идее или тексту",
    priceLabel: "Открыть студию",
    category: "ai",
    href: "/cabinet/ai/tracks",
    features: [
      "Песни с вокалом и инструментал",
      "Простой и расширенный режимы",
      "История и избранное в кабинете",
    ],
    steps: [
      "Опишите идею или вставьте свой текст",
      "Запустите генерацию и сравните варианты",
      "Сохраните понравившиеся треки в избранное",
    ],
    requirements: ["Идея или текст песни", "Аккаунт в кабинете Parallax"],
    faq: [
      {
        q: "Чем отличаются два режима?",
        a: "В простом режиме вы описываете идею песни. В расширенном добавляете собственный текст и подробнее задаёте звучание",
      },
      {
        q: "Можно создать музыку без вокала?",
        a: "Да. Включите «Инструментальная музыка» и опишите желаемое звучание",
      },
      {
        q: "Можно выпустить полученную песню?",
        a: "Возможность коммерческого использования зависит от условий модели и прав на исходные материалы",
      },
    ],
    hasBackend: true,
  },
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
  {
    ...mockService(
      "deposit",
      "Депонирование",
      "Сохранение экземпляра произведения с фиксацией даты передачи материалов",
      "от 1 490 ₽",
      "protect",
      "/cabinet/protect/deposit",
      [
        "Фиксация даты передачи материалов",
        "Сохранение переданного экземпляра",
        "Справка о депонировании",
      ]
    ),
    steps: [
      "Подготовьте аудио, текст или обложку и сведения об авторах",
      "Оформите депонирование и передайте материалы",
      "Получите справку о депонировании",
    ],
    requirements: [
      "Файлы для фиксации",
      "Название произведения",
      "Имена авторов и роли",
      "Контакт для получения справки",
    ],
    faq: [
      {
        q: "Депонирование доказывает, что я автор?",
        a: "Оно фиксирует существование переданного экземпляра на дату подачи. Авторство устанавливается с учётом других доказательств",
      },
      {
        q: "Это регистрация авторского права?",
        a: "Нет. Для возникновения авторского права регистрация не требуется. Депонирование помогает сохранить экземпляр и дату передачи",
      },
      {
        q: "Трек уже опубликован. Есть смысл депонировать?",
        a: "Можно зафиксировать текущий экземпляр. Дата подачи будет новой и не подтвердит дату создания или первой публикации",
      },
    ],
    comingSoon: true,
    interestOnly: true,
    interestCtaLabel: "Хочу задепонировать",
    paymentStub: true,
    paymentEndpoint: "/api/cabinet/payments/deposit/interest",
  },
  mockService(
    "my-deposits",
    "Мои депозиты",
    "Список ваших депонированных материалов.",
    "-",
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

/** Каталог для UI пользователя - без скрытых служебных записей. */
export function getVisibleServicesCatalog(): ServiceCatalogEntry[] {
  return SERVICES_CATALOG.filter((s) => !s.hiddenFromCatalog)
}

export const RECOMMENDED_SERVICE_SLUGS = ["vk-ads", "ai-covers", "playlists", "deposit"] as const

export const QUICK_ACTIONS = [
  { label: "Выпустить трек", href: "/cabinet/upload", description: "Загрузить новый релиз" },
  { label: "Заказать обложку", href: "/cabinet/design/covers", description: "AI обложка для релиза" },
  { label: "Запустить продвижение", href: "/cabinet/promotion/vk", description: "Реклама и промо" },
  { label: "AI-мастеринг", href: "/cabinet/design/mastering", description: "Обработка фонограммы" },
  { label: "Задепонировать", href: "/cabinet/protect/deposit", description: "Фиксация даты передачи материалов" },
] as const
