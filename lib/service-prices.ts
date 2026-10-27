import { execute, query, queryOne } from "@/lib/database"
import { AI_COVER_PRICE_RUB } from "@/lib/ai-cover-order"
import { AI_MASTERING_PRICE_RUB } from "@/lib/ai-mastering-pricing"
import { BUSINESS_MUSIC_PRICE_RUB } from "@/lib/business-music-pricing"
import { LYRICS_SYNC_PRICE_RUB } from "@/lib/lyrics-sync-pricing"
import { MUSIC_VIDEO_PRICE_RUB } from "@/lib/music-video-pricing"
import { PLAYLISTHUB_BASE_PRICE_RUB } from "@/lib/playlisthub-landing"
import { RADIO_PRICE_RUB } from "@/lib/radio-pricing"
import { SPOTIFY_VIDEOSHOT_PRICE_RUB } from "@/lib/spotify-videoshot-pricing"
import { TIKTOK_PRICE_FROM_RUB } from "@/lib/tiktok-pricing"
import { TOOLS_MASTERING_DOWNLOAD_PRICE_RUB } from "@/lib/tools-mastering-pricing"
import { TOOLS_SMARTLINK_PRICE_RUB } from "@/lib/tools-smartlink-pricing"
import { TOOLS_SLOWED_REVERB_DOWNLOAD_PRICE_RUB } from "@/lib/tools-slowed-reverb-pricing"
import { TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB } from "@/lib/tools-story-video-pricing"
import { TRACK_COVER_PRICE_RUB } from "@/lib/track-cover-pricing"
import { VK_ADS_PRICE_FROM_RUB } from "@/lib/vk-ads-campaign"
import { YANDEX_ADS_PRICE_FROM_RUB } from "@/lib/yandex-ads-campaign"
import { YANDEX_VIDEOAVATAR_PRICE_RUB } from "@/lib/yandex-videoavatar-pricing"
import { YANDEX_VIDEOSHOT_CREATION_PRICE_RUB } from "@/lib/yandex-videoshot-creation-pricing"
import { YANDEX_VIDEOSHOT_PRICE_RUB } from "@/lib/yandex-videoshot-pricing"

/** Ключи цен, которыми можно управлять в админке (не подписки, не тиры vertical video). */
export const SERVICE_PRICE_KEYS = [
  "ai_cover",
  "track_cover",
  "tools_smartlink",
  "tools_story_video",
  "tools_mastering",
  "tools_slowed_reverb",
  "lyrics_sync",
  "ai_mastering",
  "yandex_videoshot",
  "yandex_videoshot_creation",
  "yandex_videoavatar",
  "spotify_videoshot",
  "music_video",
  "business_music",
  "radio",
  "vk_ads",
  "yandex_ads",
  "playlisthub",
  "tiktok",
] as const

export type ServicePriceKey = (typeof SERVICE_PRICE_KEYS)[number]

export type ServicePriceDef = {
  key: ServicePriceKey
  title: string
  /** Подпись единицы: / трек, / год и т.п. */
  unitHint?: string
  defaultPriceRub: number
}

export const SERVICE_PRICE_DEFS: readonly ServicePriceDef[] = [
  { key: "ai_cover", title: "AI-обложка (заказ)", defaultPriceRub: AI_COVER_PRICE_RUB },
  { key: "track_cover", title: "Создание обложки", defaultPriceRub: TRACK_COVER_PRICE_RUB },
  {
    key: "tools_smartlink",
    title: "Смартлинк (Tools)",
    unitHint: "/ год",
    defaultPriceRub: TOOLS_SMARTLINK_PRICE_RUB,
  },
  {
    key: "tools_story_video",
    title: "Сниппет (скачивание)",
    defaultPriceRub: TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB,
  },
  {
    key: "tools_mastering",
    title: "Онлайн-мастеринг (скачивание)",
    defaultPriceRub: TOOLS_MASTERING_DOWNLOAD_PRICE_RUB,
  },
  {
    key: "tools_slowed_reverb",
    title: "Slowed / Reverb / Nightcore (скачивание)",
    defaultPriceRub: TOOLS_SLOWED_REVERB_DOWNLOAD_PRICE_RUB,
  },
  {
    key: "lyrics_sync",
    title: "Синхронизация текста",
    unitHint: "/ трек",
    defaultPriceRub: LYRICS_SYNC_PRICE_RUB,
  },
  {
    key: "ai_mastering",
    title: "AI-мастеринг (заказ)",
    unitHint: "/ трек",
    defaultPriceRub: AI_MASTERING_PRICE_RUB,
  },
  {
    key: "yandex_videoshot",
    title: "Видеошот ЯМ (загрузка готового)",
    defaultPriceRub: YANDEX_VIDEOSHOT_PRICE_RUB,
  },
  {
    key: "yandex_videoshot_creation",
    title: "Видеошот ЯМ (создание)",
    defaultPriceRub: YANDEX_VIDEOSHOT_CREATION_PRICE_RUB,
  },
  {
    key: "yandex_videoavatar",
    title: "Видеоаватар ЯМ",
    defaultPriceRub: YANDEX_VIDEOAVATAR_PRICE_RUB,
  },
  {
    key: "spotify_videoshot",
    title: "Видеошот Spotify",
    defaultPriceRub: SPOTIFY_VIDEOSHOT_PRICE_RUB,
  },
  {
    key: "music_video",
    title: "Видеоклип (дистрибуция)",
    unitHint: "/ клип",
    defaultPriceRub: MUSIC_VIDEO_PRICE_RUB,
  },
  {
    key: "business_music",
    title: "Музыка для бизнеса",
    unitHint: "/ трек",
    defaultPriceRub: BUSINESS_MUSIC_PRICE_RUB,
  },
  {
    key: "radio",
    title: "Радио (от)",
    unitHint: "от",
    defaultPriceRub: RADIO_PRICE_RUB,
  },
  {
    key: "vk_ads",
    title: "Продвижение VK Музыка (работа)",
    unitHint: "от",
    defaultPriceRub: VK_ADS_PRICE_FROM_RUB,
  },
  {
    key: "yandex_ads",
    title: "Продвижение Яндекс Директ (работа)",
    unitHint: "от",
    defaultPriceRub: YANDEX_ADS_PRICE_FROM_RUB,
  },
  {
    key: "playlisthub",
    title: "Плейлисты PlaylistHub",
    unitHint: "/ плейлист",
    defaultPriceRub: PLAYLISTHUB_BASE_PRICE_RUB,
  },
  {
    key: "tiktok",
    title: "TikTok / блогеры (от)",
    unitHint: "от",
    defaultPriceRub: TIKTOK_PRICE_FROM_RUB,
  },
] as const

const DEF_BY_KEY = new Map(SERVICE_PRICE_DEFS.map((d) => [d.key, d]))

export function isServicePriceKey(value: string): value is ServicePriceKey {
  return (SERVICE_PRICE_KEYS as readonly string[]).includes(value)
}

export type ResolvedServicePrice = {
  key: ServicePriceKey
  title: string
  unitHint?: string
  priceRub: number
  compareAtRub: number | null
  discountPercent: number | null
  fromDb: boolean
  updatedAt: string | null
}

type ServicePriceRow = {
  key: string
  price_rub: string | number
  compare_at_rub: string | number | null
  updated_at: string
}

function toRub(value: string | number | null | undefined): number | null {
  if (value == null) return null
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round((n + Number.EPSILON) * 100) / 100
}

function discountPercent(priceRub: number, compareAtRub: number | null): number | null {
  if (compareAtRub == null || compareAtRub <= priceRub || compareAtRub <= 0) return null
  return Math.round(((compareAtRub - priceRub) / compareAtRub) * 100)
}

function resolveFromParts(
  def: ServicePriceDef,
  priceRub: number,
  compareAtRub: number | null,
  fromDb: boolean,
  updatedAt: string | null
): ResolvedServicePrice {
  const compare =
    compareAtRub != null && compareAtRub > priceRub ? compareAtRub : null
  return {
    key: def.key,
    title: def.title,
    unitHint: def.unitHint,
    priceRub,
    compareAtRub: compare,
    discountPercent: discountPercent(priceRub, compare),
    fromDb,
    updatedAt,
  }
}

export function formatRub(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ₽`
}

/** Короткая подпись для карточек: цена + опционально скидка и "было". */
export function formatServicePriceCardLabel(p: ResolvedServicePrice): string {
  const prefix = p.unitHint === "от" ? "от " : ""
  const suffix =
    p.unitHint && p.unitHint !== "от" ? ` ${p.unitHint}` : ""
  return `${prefix}${formatRub(p.priceRub)}${suffix}`
}

export async function listResolvedServicePrices(): Promise<ResolvedServicePrice[]> {
  let rows: ServicePriceRow[] = []
  try {
    rows = await query<ServicePriceRow>(`SELECT key, price_rub, compare_at_rub, updated_at FROM service_prices`)
  } catch (e) {
    console.error("[service-prices] list failed (table missing?):", e)
  }
  const byKey = new Map(rows.map((r) => [r.key, r]))

  return SERVICE_PRICE_DEFS.map((def) => {
    const row = byKey.get(def.key)
    if (!row) {
      return resolveFromParts(def, def.defaultPriceRub, null, false, null)
    }
    const priceRub = toRub(row.price_rub) ?? def.defaultPriceRub
    const compareAtRub = toRub(row.compare_at_rub)
    return resolveFromParts(def, priceRub, compareAtRub, true, row.updated_at)
  })
}

export async function getResolvedServicePrice(key: ServicePriceKey): Promise<ResolvedServicePrice> {
  const def = DEF_BY_KEY.get(key)
  if (!def) {
    throw new Error(`Unknown service price key: ${key}`)
  }
  try {
    const row = await queryOne<ServicePriceRow>(
      `SELECT key, price_rub, compare_at_rub, updated_at FROM service_prices WHERE key = ?`,
      [key]
    )
    if (!row) {
      return resolveFromParts(def, def.defaultPriceRub, null, false, null)
    }
    const priceRub = toRub(row.price_rub) ?? def.defaultPriceRub
    return resolveFromParts(def, priceRub, toRub(row.compare_at_rub), true, row.updated_at)
  } catch (e) {
    console.error("[service-prices] get failed:", key, e)
    return resolveFromParts(def, def.defaultPriceRub, null, false, null)
  }
}

export async function getServicePriceRub(key: ServicePriceKey): Promise<number> {
  return (await getResolvedServicePrice(key)).priceRub
}

/** Карта актуальных цен для расчёта бандлов. */
export async function getServicePriceRubMap(): Promise<Record<ServicePriceKey, number>> {
  const list = await listResolvedServicePrices()
  const map = {} as Record<ServicePriceKey, number>
  for (const item of list) {
    map[item.key] = item.priceRub
  }
  return map
}

export type UpsertServicePriceInput = {
  key: ServicePriceKey
  priceRub: number
  /** null / undefined - без "старой" цены */
  compareAtRub?: number | null
}

export async function upsertServicePrice(input: UpsertServicePriceInput): Promise<ResolvedServicePrice> {
  const def = DEF_BY_KEY.get(input.key)
  if (!def) throw new Error("Unknown key")

  const priceRub = toRub(input.priceRub)
  if (priceRub == null || priceRub <= 0) {
    throw new Error("priceRub must be > 0")
  }

  let compareAtRub = input.compareAtRub == null ? null : toRub(input.compareAtRub)
  if (compareAtRub != null && compareAtRub <= priceRub) {
    compareAtRub = null
  }

  const now = new Date().toISOString()
  await execute(
    `INSERT INTO service_prices (key, price_rub, compare_at_rub, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET
       price_rub = EXCLUDED.price_rub,
       compare_at_rub = EXCLUDED.compare_at_rub,
       updated_at = EXCLUDED.updated_at`,
    [input.key, priceRub, compareAtRub, now]
  )

  return resolveFromParts(def, priceRub, compareAtRub, true, now)
}

/** Сбросить на дефолт из кода (удалить строку из БД). */
export async function resetServicePrice(key: ServicePriceKey): Promise<ResolvedServicePrice> {
  const def = DEF_BY_KEY.get(key)
  if (!def) throw new Error("Unknown key")
  await execute(`DELETE FROM service_prices WHERE key = ?`, [key])
  return resolveFromParts(def, def.defaultPriceRub, null, false, null)
}
