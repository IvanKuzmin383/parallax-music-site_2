/** Каталог ачивок кабинета. Награды ограничены экономикой (cap ₽). */

export type AchievementCategory =
  | "onboarding"
  | "catalog"
  | "finance"
  | "services"
  | "referrals"

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
  xp: number
  reward: AchievementReward
}

export const ACHIEVEMENTS_CATALOG: AchievementDef[] = [
  {
    id: "welcome",
    title: "Добро пожаловать",
    description: "Зарегистрировались в кабинете",
    category: "onboarding",
    xp: 10,
    reward: { type: "none" },
  },
  {
    id: "first_draft",
    title: "Первый черновик",
    description: "Создали черновик релиза",
    category: "onboarding",
    xp: 20,
    reward: { type: "none" },
  },
  {
    id: "first_moderation",
    title: "На проверке",
    description: "Отправили релиз на модерацию",
    category: "onboarding",
    xp: 30,
    reward: { type: "none" },
  },
  {
    id: "first_released",
    title: "Релизер",
    description: "Первый релиз на площадках",
    category: "catalog",
    xp: 50,
    reward: {
      type: "coupon",
      title: "−10% на AI-обложку",
      percentOff: 10,
      maxDiscountRub: 100,
      serviceScope: "ai_cover,track_cover",
      daysValid: 30,
    },
  },
  {
    id: "releases_3",
    title: "Каталог",
    description: "3 релиза со статусом 'Выпущен'",
    category: "catalog",
    xp: 40,
    reward: { type: "none" },
  },
  {
    id: "releases_10",
    title: "Дискография",
    description: "10 выпущенных релизов",
    category: "catalog",
    xp: 80,
    reward: {
      type: "coupon",
      title: "−10% на AI-мастеринг",
      percentOff: 10,
      maxDiscountRub: 200,
      serviceScope: "ai_mastering",
      daysValid: 45,
    },
  },
  {
    id: "first_wallet_topup",
    title: "Кошелёк",
    description: "Первое пополнение баланса",
    category: "finance",
    xp: 20,
    reward: { type: "none" },
  },
  {
    id: "first_service",
    title: "Первая услуга",
    description: "Оплатили любую услугу кабинета",
    category: "services",
    xp: 30,
    reward: {
      type: "wallet",
      amountRub: 50,
      note: "Награда за первую услугу",
    },
  },
  {
    id: "first_music_video",
    title: "Клипмейкер",
    description: "Загрузили видеоклип на площадки",
    category: "services",
    xp: 40,
    reward: { type: "none" },
  },
  {
    id: "first_publicka",
    title: "Бизнес-звук",
    description: "Разместили трек в музыке для бизнеса",
    category: "services",
    xp: 40,
    reward: { type: "none" },
  },
  {
    id: "referral_1",
    title: "Амбассадор",
    description: "Пригласили артиста, который оплатил",
    category: "referrals",
    xp: 50,
    reward: { type: "none" },
  },
  {
    id: "referral_3",
    title: "Партнёр",
    description: "3 оплативших реферала",
    category: "referrals",
    xp: 100,
    reward: {
      type: "wallet",
      amountRub: 100,
      note: "Награда за 3 реферала",
    },
  },
]

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS_CATALOG.map((a) => [a.id, a])
)

export type ArtistLevelId =
  | "novice"
  | "releaser"
  | "catalog"
  | "regular"
  | "pro"
  | "ambassador"

export type ArtistLevel = {
  id: ArtistLevelId
  title: string
  minXp: number
}

export const ARTIST_LEVELS: ArtistLevel[] = [
  { id: "novice", title: "Новичок", minXp: 0 },
  { id: "releaser", title: "Релизер", minXp: 50 },
  { id: "catalog", title: "Каталог", minXp: 120 },
  { id: "regular", title: "Регуляр", minXp: 220 },
  { id: "pro", title: "Про", minXp: 350 },
  { id: "ambassador", title: "Амбассадор", minXp: 500 },
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
  referralFirstPaymentPercent: 10,
  referralFirstPaymentCapRub: 300,
  /** Макс. сумма wallet/coupon-наград с ачивок на пользователя за календарный год. */
  annualAchievementRewardCapRub: 500,
} as const
