/** Конфиг рекламной страницы PlaylistHub на Parallax. */

export const PLAYLISTHUB_CATALOG_URL = "https://playlisthub.ru/catalog"

export const PLAYLISTHUB_BASE_PRICE_RUB = 350
export const PLAYLISTHUB_VOLUME_PRICE_RUB = 210
export const PLAYLISTHUB_VOLUME_THRESHOLD = 70

export const PLAYLISTHUB_BASE_PRICE_LABEL = `${PLAYLISTHUB_BASE_PRICE_RUB.toLocaleString("ru-RU")} ₽ / плейлист`

export const PLAYLISTHUB_VOLUME_PRICE_LABEL = `От ${PLAYLISTHUB_VOLUME_PRICE_RUB.toLocaleString("ru-RU")} ₽ при заказе ${PLAYLISTHUB_VOLUME_THRESHOLD}+ плейлистов`

export const PLAYLISTHUB_FINAL_PRICE_LABEL = `от ${PLAYLISTHUB_VOLUME_PRICE_RUB.toLocaleString("ru-RU")} ₽ за плейлист при заказе ${PLAYLISTHUB_VOLUME_THRESHOLD}+ плейлистов`

export type PlaylisthubExample = {
  id: string
  title: string
  genre: string
  href: string
  coverSrc: string
  coverAlt: string
}

export const PLAYLISTHUB_EXAMPLES: readonly PlaylisthubExample[] = [
  {
    id: "pop-muzyka",
    title: "Поп музыка",
    genre: "Pop",
    href: "https://playlisthub.ru/playlist/pop-muzyka",
    coverSrc: "/playlisthub/pop-muzyka.webp",
    coverAlt: "Обложка плейлиста Поп музыка на PlaylistHub",
  },
  {
    id: "russkiy-rok",
    title: "Русский рок",
    genre: "Rock",
    href: "https://playlisthub.ru/playlist/russkiy-rok",
    coverSrc: "/playlisthub/russkiy-rok.webp",
    coverAlt: "Обложка плейлиста Русский рок на PlaylistHub",
  },
  {
    id: "rep-hip-hop",
    title: "Рэп / Хип-хоп",
    genre: "Hip-Hop",
    href: "https://playlisthub.ru/playlist/rep-hip-hop",
    coverSrc: "/playlisthub/rep-hip-hop.webp",
    coverAlt: "Обложка плейлиста Рэп / Хип-хоп на PlaylistHub",
  },
] as const

export type PlaylisthubDiscountTier = {
  range: string
  priceRub: number
  priceLabel: string
  discountLabel: string | null
}

export const PLAYLISTHUB_DISCOUNT_TIERS: readonly PlaylisthubDiscountTier[] = [
  {
    range: "До 10",
    priceRub: 350,
    priceLabel: "350 ₽",
    discountLabel: null,
  },
  {
    range: "10-20",
    priceRub: 315,
    priceLabel: "315 ₽",
    discountLabel: "-10%",
  },
  {
    range: "20-40",
    priceRub: 280,
    priceLabel: "280 ₽",
    discountLabel: "-20%",
  },
  {
    range: "40-70",
    priceRub: 245,
    priceLabel: "245 ₽",
    discountLabel: "-30%",
  },
  {
    range: "70+",
    priceRub: 210,
    priceLabel: "210 ₽",
    discountLabel: "-40%",
  },
] as const
