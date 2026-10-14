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
    shortDescription: "Больше слушателей. Больше охват. Больше результата.",
    priceLabel: "от 5 000 ₽",
    category: "promotion",
    href: "/cabinet/promotion/vk",
    features: [
      "Точное попадание - показываем рекламу тем, кто интересуется вашей музыкой",
      "Рост аудитории - увеличиваем подписчиков и прослушивания вокруг релиза",
      "Больше охват - продвигаем релиз и привлекаем новых слушателей",
      "AI-креативы - создаём цепляющую рекламу с помощью AI для результата",
    ],
    steps: [
      "Бриф - обсуждаем цели: прослушивания, подписчики, переходы",
      "Настройка - настраиваем таргетинг и готовим креативы для VK Реклама",
      "Запуск - запускаем кампанию в ленте, VK Музыке, Stories и других форматах",
      "Оптимизация - анализируем показы, клики и CTR, улучшаем результат ежедневно",
    ],
    requirements: [
      "Ссылка на трек или сообщество",
      "Цели кампании (прослушивания, подписчики, переходы)",
      "Контакт для связи",
    ],
    faq: [
      {
        q: "Какой бюджет нужен для старта?",
        a: "Бюджет обсуждается индивидуально - зависит от целей и масштаба кампании. Менеджер предложит оптимальный вариант.",
      },
      {
        q: "Где будет показываться реклама?",
        a: "VK Музыка, лента, Stories, клипы и другие плейсменты - подбираем под задачу.",
      },
      {
        q: "Будет ли отчёт по результатам?",
        a: "Да, отслеживаем показы, клики, CTR и динамику - предоставляем аналитику по кампании.",
      },
      {
        q: "Как заказать?",
        a: "Оформите заявку на этой странице и укажите ссылку на трек или сообщество - менеджер свяжется с вами.",
      },
    ],
    hasBackend: false,
  },
  {
    slug: "yandex-ads",
    title: "Продвижение в Яндекс Директ",
    shortDescription: "Точное продвижение под ваши цели и аудиторию",
    priceLabel: "от 5 000 ₽",
    category: "promotion",
    href: "/cabinet/promotion/yandex",
    features: [
      "Индивидуальная настройка - кампания под ваши цели и задачи",
      "Поиск новой аудитории - точный таргетинг по интересам и поведению",
      "Продвижение любых целей - трек, концерт, мерч, сайт, соцсети и другие",
      "Оптимизация - постоянный анализ и улучшение кампании",
    ],
    steps: [
      "Цели - определяем, что продвигаем: трек, концерт, мерч или другое",
      "Кампания - настраиваем объявления, аудитории и бюджет в Яндекс Директ",
      "Запуск - запускаем рекламу в поиске, РСЯ и других каналах",
      "ROI - отслеживаем клики, конверсии и оптимизируем для лучшего результата",
    ],
    requirements: [
      "Что продвигаем (трек, концерт, мерч, сайт, соцсети и др.)",
      "Ссылка на объект продвижения (если есть)",
      "Контакт для связи",
    ],
    faq: [
      {
        q: "Можно продвигать не только трек?",
        a: "Да - концерты, мерч, сайт, соцсети и любые другие цели, которые важны артисту.",
      },
      {
        q: "Как формируется бюджет?",
        a: "Бюджет согласуем индивидуально. Менеджер предложит вариант под ваши цели.",
      },
      {
        q: "Какие метрики отслеживаете?",
        a: "Просмотры, клики, CTR, конверсии и динамику по дням - как в рекламном кабинете.",
      },
      {
        q: "Как заказать?",
        a: "Оформите заявку на этой странице и опишите задачу - менеджер свяжется для настройки.",
      },
    ],
    hasBackend: false,
  },
  {
    slug: "playlists",
    title: "Размещение в плейлистах Яндекс Музыки",
    shortDescription: "Самый быстрый способ начать продвижение нового релиза",
    priceLabel: "от 350 ₽ / плейлист",
    category: "promotion",
    href: "/cabinet/promotion/playlists",
    features: [
      "Быстрый запуск - без долгой подготовки",
      "Первые прослушивания - уже после размещения",
      "Бессрочное размещение - трек не удаляется из плейлистов",
      "Свои и партнёрские плейлисты - широкий охват вашей музыки",
    ],
    steps: [
      "Заявка - пришлите ссылку на трек и кратко опишите релиз",
      "Подбор плейлистов - подбираем плейлисты с релевантной аудиторией",
      "Размещение - добавляем трек в плейлисты, размещение бессрочное",
      "Статистика - отслеживаем рост прослушиваний и активность слушателей",
    ],
    requirements: [
      "Ссылка на трек",
      "Краткое описание релиза",
      "Контакт для связи",
    ],
    faq: [
      {
        q: "Когда появятся первые прослушивания?",
        a: "Как правило, уже после размещения в плейлистах - слушатели начинают находить трек через подборки.",
      },
      {
        q: "Трек могут удалить из плейлиста?",
        a: "Мы размещаем треки бессрочно - трек не удаляется из наших и партнёрских плейлистов.",
      },
      {
        q: "Подходит ли услуга для уже выпущенного трека?",
        a: "Да, можно продвигать как новый, так и уже вышедший релиз.",
      },
      {
        q: "Как заказать?",
        a: "Оформите заявку на этой странице или выберите плейлисты на PlaylistHub (playlisthub.ru).",
      },
    ],
    hasBackend: false,
  },
  {
    ...mockService(
      "tiktok",
      "TikTok / Блогеры",
      "Продвижение трека через короткие видео и блогеров.",
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
        a: "Фиксированных гарантий просмотров и переходов в прослушивания нет. Реакция аудитории зависит от трека, ролика и конкретного размещения. Результат оценивается по доступным данным публикаций.",
      },
      {
        q: "Что нужно для старта?",
        a: "Название релиза, ссылка на трек, бюджет и пожелания к продвижению. По этим данным обсуждаются формат и условия размещения.",
      },
      {
        q: "Сколько занимает размещение?",
        a: "Сроки согласуются для выбранного формата и блогеров. Конкретный срок указывается при оформлении заказа.",
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
        a: "Подготовка материалов, размещение трека в радио-витрине Parallax Music и подтверждение выполнения.",
      },
      {
        q: "Нужно ли сейчас оплачивать?",
        a: "Сейчас заявка предварительная и оплата не списывается. Мы свяжемся с вами для уточнения деталей.",
      },
      {
        q: "Какие сроки размещения?",
        a: "Сроки определяются при согласовании условий по вашему треку. Конкретный срок должен быть указан перед оформлением размещения.",
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
      "Размещение в каталоге фоновой музыки (БизнесЗвук): статистика и 0,01 ₽ за прослушивание.",
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
        a: "Проверка прав, добавление одного согласованного трека в каталог БизнесЗвука, статистика прослушиваний и начисления роялти.",
      },
      {
        q: "Будут ли мой трек обязательно включать?",
        a: "Услуга предусматривает размещение в каталоге. Количество прослушиваний зависит от фактического использования трека в сервисе; заранее определённого объёма воспроизведений нет.",
      },
      {
        q: "Как рассчитываются роялти?",
        a: "По ставке 0,01 ₽ за учитываемое прослушивание. Например, 10 000 прослушиваний соответствуют начислению 100 ₽. Фактическая сумма зависит от использования трека.",
      },
      {
        q: "Что подготовить для заявки?",
        a: "Название трека или релиза и ссылку на композицию, если она есть. Менеджер свяжется с вами и уточнит информацию, необходимую для проверки прав и размещения.",
      },
      {
        q: "Сколько занимает выполнение?",
        a: "Срок зависит от услуги - обычно от 3 до 14 рабочих дней.",
      },
      {
        q: "Можно ли вернуть оплату?",
        a: "Возврат возможен до начала работы - напишите в поддержку.",
      },
    ],
  },
  {
    slug: "ai-covers",
    title: "AI Обложки",
    shortDescription:
      "6-9 вариантов обложки по материалам релиза, одна финальная 3000 × 3000 для стримингов.",
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
        a: "6-9 AI-вариантов на выбор, согласование одного выбранного варианта и одна финальная обложка 3000 × 3000 пикселей.",
      },
      {
        q: "Можно добавить имя артиста и название релиза?",
        a: "Да. В форме включите галку и заполните оба поля. Стоимость остаётся 500 ₽.",
      },
      { q: "Какой размер финала?", a: "3000 × 3000 пикселей." },
    ],
    hasBackend: true,
    paymentEndpoint: "/api/cabinet/payments/ai-cover/create",
    orderType: "ai_cover",
  },
  {
    slug: "vertical-videos",
    title: "Вертикальные видео",
    shortDescription:
      "Монтаж коротких вертикальных роликов из готовых общедоступных видео под ваш трек.",
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
        a: "Да: 1-10 видео - 249 ₽ за ролик, 11-50 - 199 ₽, 51-500 - 149 ₽.",
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
        a: "В среднем 5-6 дней.",
      },
      {
        q: "На какие площадки доставляется видеоклип?",
        a: "Apple Music, VK Клипы, Яндекс Музыка.",
      },
      {
        q: "Доступна ли статистика просмотров?",
        a: "Просмотры видеоклипов на данный момент в кабинете не отображаются. Итоговые показатели поступают в финансовом отчёте.",
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
    shortDescription: "Загрузим готовый ролик или создадим видеошот под ваш трек.",
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
        a: `Если ролик готов - загрузка за ${YANDEX_VIDEOSHOT_PRICE_RUB} ₽. Если нужен видеоряд под трек - создание за ${YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} ₽ с публикацией.`,
      },
      {
        q: "Публикация входит в создание?",
        a: `Да. В ${YANDEX_VIDEOSHOT_CREATION_PRICE_RUB} ₽ входят создание, проверка и загрузка одного видеошота.`,
      },
    ],
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
        a: "Зацикленное вертикальное видео 5-15 секунд для карточки релиза в Яндекс Музыке.",
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
  {
    ...mockService(
      "lyrics-sync",
      "Синхронизация текста",
      "Строки текста привязаны к моментам исполнения в вашей финальной записи.",
      LYRICS_SYNC_PRICE_LABEL,
      "design",
      "/cabinet/design/lyrics-sync",
      [
        "Разметка строк по времени",
        "Проверка по аудиозаписи",
        "Подготовка к размещению",
      ]
    ),
    steps: [
      "Пришлите финальную аудиозапись и полный текст в порядке исполнения",
      "Сопоставим строки с вокалом и проверим разметку по записи",
      "Подготовим синхронизированный текст для дальнейшего размещения",
    ],
    requirements: [
      "Ссылка на финальную версию трека",
      "Полный текст песни в порядке исполнения",
      "Комментарий (по желанию)",
    ],
    faq: [
      {
        q: "Чем отличается синхронизированный текст?",
        a: "Строки привязаны к моментам исполнения. Плеер с поддержкой этой функции выделяет нужную строку по мере звучания песни.",
      },
      {
        q: "Нужно прислать готовый текст?",
        a: "Да. Передайте полный текст вашей песни в порядке исполнения вместе с финальной аудиозаписью.",
      },
      {
        q: "Почему нужна финальная версия трека?",
        a: "Разметка связана со временем в конкретной записи. Другая длительность, вступление или структура песни могут потребовать новой синхронизации.",
      },
      {
        q: "Что делать с повторяющимся припевом?",
        a: "Приведите его текст каждый раз, когда он звучит, чтобы последовательность строк соответствовала записи.",
      },
    ],
    paymentStub: true,
    paymentEndpoint: "/api/cabinet/payments/lyrics-sync/interest",
    interestCtaLabel: "Отправить заявку",
    linkFieldLabel: "Ссылка на финальную версию трека",
    linkFieldPlaceholder: "https://disk.yandex.ru/...",
    linkFieldHint: "Используйте именно ту запись, для которой нужен текст.",
    linkFieldRequired: true,
  },
  {
    slug: "ai-tracks",
    title: "Генерация музыки",
    shortDescription:
      "Создавайте песни с вокалом и инструментальную музыку по своей идее или тексту.",
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
        a: "В простом режиме вы описываете идею песни. В расширенном добавляете собственный текст и подробнее задаёте звучание.",
      },
      {
        q: "Можно создать музыку без вокала?",
        a: "Да. Включите «Инструментальная музыка» и опишите желаемое звучание.",
      },
      {
        q: "Можно выпустить полученную песню?",
        a: "Возможность коммерческого использования зависит от условий модели и прав на исходные материалы.",
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
      "Сохранение экземпляра произведения с фиксацией даты передачи материалов.",
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
        a: "Оно фиксирует существование переданного экземпляра на дату подачи. Авторство устанавливается с учётом других доказательств.",
      },
      {
        q: "Это регистрация авторского права?",
        a: "Нет. Для возникновения авторского права регистрация не требуется. Депонирование помогает сохранить экземпляр и дату передачи.",
      },
      {
        q: "Трек уже опубликован. Есть смысл депонировать?",
        a: "Можно зафиксировать текущий экземпляр. Дата подачи будет новой и не подтвердит дату создания или первой публикации.",
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
