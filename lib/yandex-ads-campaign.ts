/** Конфиг объектов продвижения Яндекс Директ - карточки, форма и примеры объявлений. */

export const YANDEX_ADS_PRICE_FROM_RUB = 5000

export const YANDEX_ADS_PRICE_LABEL = `от ${YANDEX_ADS_PRICE_FROM_RUB.toLocaleString("ru-RU")} ₽`

export type YandexAdsObjectId = "release" | "concert" | "merch" | "project"

export type YandexAdsObjectConfig = {
  id: YandexAdsObjectId
  title: string
  cardCaption: string
  explanation: string
  defaultHeadline: string
  adDescription: string
  ctaLabel: string
  destination: string
  imageTopLabel: string
  /** Две строки крупной надписи на изображении. */
  imageLines: readonly [string, string]
  searchQuery: string
  nameFieldLabel: string
  nameFieldPlaceholder: string
  linkFieldLabel: string
}

export const YANDEX_ADS_OBJECTS: readonly YandexAdsObjectConfig[] = [
  {
    id: "release",
    title: "Релиз",
    cardCaption: "Трек, альбом или страница артиста",
    explanation:
      "Знакомим аудиторию с вашим релизом и направляем её к музыке. Подача начинается с трека, а не с рекламных терминов.",
    defaultHeadline: "Ваш артист - новый релиз",
    adDescription: "Новая музыка уже здесь. Откройте трек и найдите свой ритм.",
    ctaLabel: "Слушать",
    destination: "Страница вашего релиза",
    imageTopLabel: "НОВЫЙ РЕЛИЗ",
    imageLines: ["НАСТРОЙСЯ", "НА НОВОЕ."],
    searchQuery: "новая музыка",
    nameFieldLabel: "Название релиза / проекта",
    nameFieldPlaceholder: "Артист - название релиза",
    linkFieldLabel: "Ссылка на трек / релиз",
  },
  {
    id: "concert",
    title: "Концерт",
    cardCaption: "Событие и страница с билетами",
    explanation:
      "Представляем событие аудитории с учётом географии и направляем людей на страницу концерта или к покупке билетов.",
    defaultHeadline: "Ваш артист - живой концерт",
    adDescription:
      "Музыка, которую хочется услышать вживую. Узнайте о концерте и выберите билет.",
    ctaLabel: "Смотреть билеты",
    destination: "Страница концерта и билеты",
    imageTopLabel: "ЖИВОЙ КОНЦЕРТ",
    imageLines: ["ВСТРЕТИМСЯ", "НА СЦЕНЕ."],
    searchQuery: "концерты и живая музыка",
    nameFieldLabel: "Название концерта / проекта",
    nameFieldPlaceholder: "Артист - название концерта",
    linkFieldLabel: "Ссылка на концерт / билеты",
  },
  {
    id: "merch",
    title: "Мерч",
    cardCaption: "Коллекция или товар вашего проекта",
    explanation:
      "Рассказываем о вашем мерче и направляем заинтересованную аудиторию к коллекции или конкретному товару.",
    defaultHeadline: "Ваш артист - коллекция мерча",
    adDescription:
      "Ваша любимая музыка - часть вашего стиля. Познакомьтесь с коллекцией артиста.",
    ctaLabel: "Посмотреть коллекцию",
    destination: "Коллекция или страница товара",
    imageTopLabel: "МЕРЧ АРТИСТА",
    imageLines: ["НОСИ", "СВОЙ ЗВУК."],
    searchQuery: "мерч музыкальных артистов",
    nameFieldLabel: "Название коллекции / проекта",
    nameFieldPlaceholder: "Артист - название коллекции",
    linkFieldLabel: "Ссылка на мерч / товар",
  },
  {
    id: "project",
    title: "Проект",
    cardCaption: "Сайт, сообщество или другой объект",
    explanation:
      "Привлекаем внимание к сайту, сообществу или другой странице проекта. Целевое действие определяем вместе с вами.",
    defaultHeadline: "Ваш артист - музыкальный проект",
    adDescription: "Истории, релизы и всё, что звучит по-своему. Узнайте больше о проекте.",
    ctaLabel: "Открыть проект",
    destination: "Сайт или сообщество проекта",
    imageTopLabel: "МУЗЫКАЛЬНЫЙ ПРОЕКТ",
    imageLines: ["ОТКРОЙ", "СВОЙ МИР."],
    searchQuery: "новые музыкальные проекты",
    nameFieldLabel: "Название проекта",
    nameFieldPlaceholder: "Название вашего проекта",
    linkFieldLabel: "Ссылка на сайт / сообщество",
  },
] as const

export const YANDEX_ADS_DEFAULT_OBJECT: YandexAdsObjectId = "release"

export function getYandexAdsObject(id: string): YandexAdsObjectConfig {
  return YANDEX_ADS_OBJECTS.find((o) => o.id === id) ?? YANDEX_ADS_OBJECTS[0]
}

export function isYandexAdsObjectId(value: string): value is YandexAdsObjectId {
  return YANDEX_ADS_OBJECTS.some((o) => o.id === value)
}
