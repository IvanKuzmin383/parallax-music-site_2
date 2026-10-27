/** Каталог ачивок кабинета. Награды ограничены экономикой (cap ₽). */

export type AchievementCategory =
  | "onboarding"
  | "catalog"
  | "finance"
  | "services"
  | "referrals"
  | "growth"

export type AchievementRarity = "common" | "rare" | "legendary"

export type AchievementReward =
  | { type: "none" }
  | { type: "wallet"; amountRub: number; note: string }
  | {
      type: "coupon"
      title: string
      percentOff: number
      maxDiscountRub: number
      /** CSV orderType или "services" */
      serviceScope: string
      daysValid: number
    }

export type AchievementDef = {
  id: string
  title: string
  description: string
  category: AchievementCategory
  rarity: AchievementRarity
  xp: number
  reward: AchievementReward
}

export const ACHIEVEMENTS_CATALOG: AchievementDef[] = [
  {
    id: "first_light",
    title: "Первый свет",
    description: "Доведите релиз до площадок: черновик → модерация → релиз",
    category: "onboarding",
    rarity: "common",
    xp: 80,
    reward: {
      type: "coupon",
      title: "−10% на AI-обложку",
      percentOff: 10,
      maxDiscountRub: 100,
      serviceScope: "ai_cover,track_cover",
      daysValid: 45,
    },
  },
  {
    id: "catalog_5",
    title: "Каталог",
    description: "5 релизов со статусом «Выпущен»",
    category: "catalog",
    rarity: "rare",
    xp: 100,
    reward: {
      type: "coupon",
      title: "−15% на AI-мастеринг",
      percentOff: 15,
      maxDiscountRub: 250,
      serviceScope: "ai_mastering,tools_mastering_download",
      daysValid: 45,
    },
  },
  {
    id: "catalog_25",
    title: "Дискография",
    description: "25 выпущенных релизов",
    category: "catalog",
    rarity: "legendary",
    xp: 200,
    reward: {
      type: "coupon",
      title: "−10% на инструменты",
      percentOff: 10,
      maxDiscountRub: 250,
      serviceScope:
        "tools_smartlink,tools_story_video_download,tools_mastering_download,tools_slowed_reverb_download,ai_mastering",
      daysValid: 60,
    },
  },
  {
    id: "year_round",
    title: "Круглый год",
    description: "Релизы в 3 разных календарных кварталах",
    category: "catalog",
    rarity: "legendary",
    xp: 120,
    reward: {
      type: "wallet",
      amountRub: 50,
      note: "Награда за релизы в трёх кварталах",
    },
  },
  {
    id: "first_royalty",
    title: "Первые роялти",
    description: "Получили первое начисление роялти",
    category: "finance",
    rarity: "rare",
    xp: 80,
    reward: {
      type: "coupon",
      title: "−5% на музыку для бизнеса",
      percentOff: 5,
      maxDiscountRub: 250,
      serviceScope: "business_music",
      daysValid: 45,
    },
  },
  {
    id: "streams_10k",
    title: "10K прослушиваний",
    description: "Суммарно 10 000 прослушиваний по статистике кабинета",
    category: "growth",
    rarity: "rare",
    xp: 150,
    reward: {
      type: "coupon",
      title: "−10% на клип / vertical video",
      percentOff: 10,
      maxDiscountRub: 250,
      serviceScope: "music_video,vertical_video,yandex_videoshot,yandex_videoshot_creation,spotify_videoshot",
      daysValid: 45,
    },
  },
  {
    id: "paid_artist",
    title: "Инвестор в себя",
    description: "Суммарное пополнение баланса от 5 000 ₽",
    category: "finance",
    rarity: "common",
    xp: 60,
    reward: {
      type: "wallet",
      amountRub: 150,
      note: "Награда за пополнение баланса от 5 000 ₽",
    },
  },
  {
    id: "link_in_bio",
    title: "Ссылка в био",
    description: "Опубликовали смартлинк",
    category: "services",
    rarity: "common",
    xp: 50,
    reward: {
      type: "coupon",
      title: "Бесплатный сниппет (story video)",
      percentOff: 100,
      maxDiscountRub: 100,
      serviceScope: "tools_story_video_download",
      daysValid: 30,
    },
  },
  {
    id: "visual",
    title: "Клипмейкер",
    description: "Загрузили видеоклип на площадки",
    category: "services",
    rarity: "rare",
    xp: 70,
    reward: {
      type: "coupon",
      title: "−10% на video-продукт",
      percentOff: 10,
      maxDiscountRub: 200,
      serviceScope:
        "music_video,vertical_video,yandex_videoshot,yandex_videoshot_creation,yandex_videoavatar,spotify_videoshot",
      daysValid: 45,
    },
  },
  {
    id: "studio",
    title: "Студия",
    description: "Скачали онлайн-мастеринг или Slowed / Reverb",
    category: "services",
    rarity: "common",
    xp: 50,
    reward: {
      type: "coupon",
      title: "−100% на следующий mastering-download",
      percentOff: 100,
      maxDiscountRub: 100,
      serviceScope: "tools_mastering_download",
      daysValid: 30,
    },
  },
  {
    id: "crew_1",
    title: "Свой круг",
    description: "Пригласили артиста, который оплатил",
    category: "referrals",
    rarity: "rare",
    xp: 80,
    reward: {
      type: "wallet",
      amountRub: 50,
      note: "Награда за первого оплатившего реферала",
    },
  },
  {
    id: "crew_5",
    title: "Лейбл внутри лейбла",
    description: "5 оплативших рефералов",
    category: "referrals",
    rarity: "legendary",
    xp: 200,
    reward: {
      type: "wallet",
      amountRub: 300,
      note: "Награда за 5 оплативших рефералов",
    },
  },
]

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS_CATALOG.map((a) => [a.id, a])
)

export type ArtistLevelId =
  | "novice"
  | "releaser"
  | "rising"
  | "catalog"
  | "pro"
  | "legend"

export type ArtistLevel = {
  id: ArtistLevelId
  title: string
  minXp: number
  /** Короткий бонус уровня для UI (статус / привилегия). */
  perk: string
}

export const ARTIST_LEVELS: ArtistLevel[] = [
  { id: "novice", title: "Новичок", minXp: 0, perk: "Старт пути в Parallax" },
  { id: "releaser", title: "Релизер", minXp: 80, perk: "Бейдж релизера в профиле достижений" },
  { id: "rising", title: "На подъёме", minXp: 200, perk: "Статус активного артиста" },
  { id: "catalog", title: "Каталог", minXp: 400, perk: "Расширенная коллекция ачивок" },
  { id: "pro", title: "Про", minXp: 650, perk: "Приоритетная очередь в поддержке" },
  { id: "legend", title: "Легенда", minXp: 1000, perk: "Легендарный статус в кабинете" },
]

export function resolveArtistLevel(xp: number): ArtistLevel {
  let current = ARTIST_LEVELS[0]!
  for (const level of ARTIST_LEVELS) {
    if (xp >= level.minXp) current = level
  }
  return current
}

export function nextArtistLevel(xp: number): ArtistLevel | null {
  const current = resolveArtistLevel(xp)
  const idx = ARTIST_LEVELS.findIndex((l) => l.id === current.id)
  return ARTIST_LEVELS[idx + 1] ?? null
}

/** Короткий текст награды для UI, или null если награды нет. */
export function formatAchievementReward(reward: AchievementReward): string | null {
  if (reward.type === "wallet") return `+${reward.amountRub} ₽ на баланс`
  if (reward.type === "coupon") {
    return `${reward.title} (до ${reward.maxDiscountRub} ₽, ${reward.daysValid} дн.)`
  }
  return null
}

/** Экономика рефералки и годовой потолок наград. */
export const GAMIFICATION_ECONOMY = {
  /** % с подходящих оплат приглашённого (подписки, тарифы, инструменты). */
  referralPaymentPercent: 5,
  /** Суммарный потолок начислений на одного приглашённого, ₽. */
  referralPerInviteeCapRub: 3000,
  /** @deprecated используйте referralPaymentPercent */
  referralFirstPaymentPercent: 5,
  /** @deprecated используйте referralPerInviteeCapRub */
  referralFirstPaymentCapRub: 3000,
  /** Макс. сумма wallet/coupon-наград с ачивок на пользователя за календарный год. */
  annualAchievementRewardCapRub: 1200,
} as const
