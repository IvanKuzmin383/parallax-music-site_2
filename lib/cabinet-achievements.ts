import { execute, query, queryOne } from "@/lib/database"
import { creditWalletBonus, roundMoney } from "@/lib/cabinet-balance"
import { createPercentCoupon } from "@/lib/cabinet-coupons"
import { tryCreateCabinetNotification } from "@/lib/cabinet-notifications"
import {
  ACHIEVEMENT_BY_ID,
  ACHIEVEMENTS_CATALOG,
  ARTIST_LEVELS,
  GAMIFICATION_ECONOMY,
  formatAchievementReward,
  nextArtistLevel,
  resolveArtistLevel,
  type AchievementDef,
  type AchievementRarity,
  type ArtistLevel,
} from "@/lib/cabinet/achievements-catalog"
import { getCabinetUserById } from "@/lib/cabinet-users"
import { listReleasesByUserId } from "@/lib/releases"

export type UserAchievementView = {
  id: string
  title: string
  description: string
  category: AchievementDef["category"]
  rarity: AchievementRarity
  xp: number
  /** Текст награды для UI, null если только XP */
  rewardLabel: string | null
  unlocked: boolean
  unlockedAt: string | null
  /** Прогресс к цели (для UI "2 из 3"). Для бинарных: 0/1 или 1/1. */
  progressCurrent: number
  progressTarget: number
}

export type GamificationProgress = {
  xp: number
  level: ArtistLevel
  nextLevel: ArtistLevel | null
  /** Все уровни по порядку (лестница) */
  levels: ArtistLevel[]
  unlockedCount: number
  totalCount: number
  achievements: UserAchievementView[]
}

type UnlockRow = {
  achievement_id: string
  unlocked_at: string
  reward_note: string | null
}

async function listUnlockedIds(userId: string): Promise<Map<string, UnlockRow>> {
  const rows = await query<UnlockRow>(
    `
    SELECT achievement_id, unlocked_at, reward_note
    FROM cabinet_user_achievements
    WHERE user_id = ?
    `,
    [userId]
  )
  return new Map(rows.map((r) => [r.achievement_id, r]))
}

async function sumAchievementRewardsThisYear(userId: string): Promise<number> {
  const yearStart = `${new Date().getUTCFullYear()}-01-01T00:00:00.000Z`
  const row = await queryOne<{ s: number | string | null }>(
    `
    SELECT COALESCE(SUM(amount), 0) AS s
    FROM cabinet_balance_transactions
    WHERE user_id = ?
      AND type = 'achievement_reward'
      AND created_at >= ?
    `,
    [userId, yearStart]
  )
  return roundMoney(Number(row?.s) || 0)
}

async function grantReward(userId: string, def: AchievementDef): Promise<string | null> {
  const reward = def.reward
  if (reward.type === "none") return null

  const spent = await sumAchievementRewardsThisYear(userId)
  const cap = GAMIFICATION_ECONOMY.annualAchievementRewardCapRub

  if (reward.type === "wallet") {
    const remaining = Math.max(0, roundMoney(cap - spent))
    const amount = Math.min(reward.amountRub, remaining)
    if (amount <= 0) return "Лимит наград на год исчерпан"
    const credited = await creditWalletBonus({
      userId,
      amount,
      type: "achievement_reward",
      note: `${reward.note} (${def.id})`,
      idempotencyToken: `ach:${def.id}`,
    })
    if (!credited.ok) return credited.error
    return `+${amount} ₽ на баланс`
  }

  if (reward.type === "coupon") {
    const est = reward.maxDiscountRub
    if (spent + est > cap) return "Лимит наград на год исчерпан"
    const coupon = await createPercentCoupon({
      userId,
      title: reward.title,
      percentOff: reward.percentOff,
      maxDiscountRub: reward.maxDiscountRub,
      serviceScope: reward.serviceScope,
      daysValid: reward.daysValid,
      source: `achievement:${def.id}`,
    })
    return `Купон ${coupon.code}`
  }

  return null
}

/** Разблокирует ачивку, если ещё нет. Возвращает true если новая. */
export async function unlockAchievement(
  userId: string,
  achievementId: string
): Promise<{ unlocked: boolean; rewardNote: string | null }> {
  const def = ACHIEVEMENT_BY_ID[achievementId]
  if (!def) return { unlocked: false, rewardNote: null }

  const existing = await queryOne<{ achievement_id: string }>(
    `
    SELECT achievement_id FROM cabinet_user_achievements
    WHERE user_id = ? AND achievement_id = ?
    LIMIT 1
    `,
    [userId, achievementId]
  )
  if (existing) return { unlocked: false, rewardNote: null }

  const now = new Date().toISOString()
  try {
    await execute(
      `
      INSERT INTO cabinet_user_achievements (user_id, achievement_id, unlocked_at, reward_note)
      VALUES (?, ?, ?, NULL)
      `,
      [userId, achievementId, now]
    )
  } catch {
    // unique race - already unlocked
    return { unlocked: false, rewardNote: null }
  }

  let rewardNote: string | null = null
  try {
    rewardNote = await grantReward(userId, def)
    if (rewardNote) {
      await execute(
        `
        UPDATE cabinet_user_achievements
        SET reward_note = ?
        WHERE user_id = ? AND achievement_id = ?
        `,
        [rewardNote, userId, achievementId]
      )
    }
  } catch (e) {
    console.error("[cabinet-achievements] reward failed", { userId, achievementId, e })
  }

  try {
    await tryCreateCabinetNotification({
      userId,
      type: "achievement",
      title: `Достижение: ${def.title}`,
      body: rewardNote
        ? `${def.description}. Награда: ${rewardNote}`
        : def.description,
      href: "/cabinet/settings?tab=achievements",
      entityType: "achievement",
      entityId: achievementId,
    })
  } catch {
    // ignore
  }

  return { unlocked: true, rewardNote }
}

type AchievementCounters = {
  releasedCount: number
  hasDraft: boolean
  hadModeration: boolean
  releaseQuarters: number
  hasRoyalty: boolean
  totalPlays: number
  hasPaidArtist: boolean
  hasSmartlink: boolean
  hasClip: boolean
  hasStudioTool: boolean
  referralPaidCount: number
}

function releaseQuarterKey(releaseDate: string | undefined): string | null {
  if (!releaseDate) return null
  const m = /^(\d{4})-(\d{2})/.exec(releaseDate.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (!year || month < 1 || month > 12) return null
  const q = Math.floor((month - 1) / 3) + 1
  return `${year}-Q${q}`
}

async function loadAchievementCounters(userId: string): Promise<AchievementCounters> {
  const empty: AchievementCounters = {
    releasedCount: 0,
    hasDraft: false,
    hadModeration: false,
    releaseQuarters: 0,
    hasRoyalty: false,
    totalPlays: 0,
    hasPaidArtist: false,
    hasSmartlink: false,
    hasClip: false,
    hasStudioTool: false,
    referralPaidCount: 0,
  }

  let userEmail: string | null = null
  try {
    const user = await getCabinetUserById(userId)
    userEmail = user?.email?.trim().toLowerCase() || null
    const byId = await listReleasesByUserId(userId, 300)
    const byEmail =
      userEmail && userEmail !== userId.toLowerCase()
        ? await listReleasesByUserId(userEmail, 300)
        : []
    const seen = new Set<string>()
    const releases = [...byId, ...byEmail].filter((r) => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
    empty.hasDraft = releases.length > 0
    empty.hadModeration = releases.some(
      (r) =>
        r.status === "on_moderation" ||
        r.status === "sent_to_platforms" ||
        r.status === "approved_by_platforms" ||
        r.status === "released"
    )
    const released = releases.filter((r) => r.status === "released")
    empty.releasedCount = released.length
    const quarters = new Set<string>()
    for (const r of released) {
      const key = releaseQuarterKey(r.releaseDate)
      if (key) quarters.add(key)
    }
    empty.releaseQuarters = quarters.size
  } catch {
    // keep defaults
  }

  try {
    const royalty = await queryOne<{ id: string }>(
      `
      SELECT id FROM cabinet_balance_transactions
      WHERE user_id = ?
        AND type IN ('royalty_credit', 'royalty_to_wallet')
      LIMIT 1
      `,
      [userId]
    )
    empty.hasRoyalty = Boolean(royalty)
  } catch {
    /* ignore */
  }

  try {
    const ids = [userId.toLowerCase()]
    if (userEmail && userEmail !== userId.toLowerCase()) ids.push(userEmail)
    const placeholders = ids.map(() => "?").join(",")
    const plays = await queryOne<{ s: number | string | null }>(
      `
      SELECT COALESCE(SUM(d.plays), 0) AS s
      FROM music_platform_track_daily_plays d
      JOIN cabinet_music_track_map m
        ON m.platform_key = d.platform_key
       AND m.track_key = d.track_key
      WHERE m.user_id IN (${placeholders})
      `,
      ids
    )
    empty.totalPlays = Math.floor(Number(plays?.s) || 0)
  } catch {
    /* ignore */
  }

  try {
    const topupSum = await queryOne<{ s: number | string | null }>(
      `
      SELECT COALESCE(SUM(amount), 0) AS s
      FROM cabinet_balance_transactions
      WHERE user_id = ? AND type = 'topup'
      `,
      [userId]
    )
    empty.hasPaidArtist = roundMoney(Number(topupSum?.s) || 0) >= 5000
  } catch {
    /* ignore */
  }

  try {
    const smartlink = await queryOne<{ id: string }>(
      `
      SELECT id FROM smartlinks
      WHERE user_id = ? AND status = 'active'
      LIMIT 1
      `,
      [userId]
    )
    empty.hasSmartlink = Boolean(smartlink)
  } catch {
    /* ignore */
  }

  try {
    const clip = await queryOne<{ id: string }>(
      `SELECT id FROM video_clips WHERE user_id = ? LIMIT 1`,
      [userId]
    )
    empty.hasClip = Boolean(clip)
  } catch {
    /* ignore */
  }

  try {
    const studio = await queryOne<{ id: string }>(
      `
      SELECT id FROM orders
      WHERE user_id = ?
        AND status = 'paid'
        AND order_type IN ('tools_mastering_download', 'tools_slowed_reverb_download')
      LIMIT 1
      `,
      [userId]
    )
    if (studio) {
      empty.hasStudioTool = true
    } else {
      const masteringFile = await queryOne<{ id: string }>(
        `SELECT id FROM tools_mastering_files WHERE user_id = ? LIMIT 1`,
        [userId]
      )
      empty.hasStudioTool = Boolean(masteringFile)
    }
  } catch {
    /* ignore */
  }

  try {
    const refCount = await queryOne<{ c: number | string }>(
      `SELECT COUNT(DISTINCT referred_user_id)::int AS c
       FROM cabinet_referral_rewards
       WHERE referrer_user_id = ?`,
      [userId]
    )
    empty.referralPaidCount = Number(refCount?.c) || 0
  } catch {
    /* ignore */
  }
  return empty
}

function progressForAchievement(
  id: string,
  unlocked: boolean,
  c: AchievementCounters
): { progressCurrent: number; progressTarget: number } {
  const done = (ok: boolean) => ({
    progressCurrent: unlocked || ok ? 1 : 0,
    progressTarget: 1,
  })
  switch (id) {
    case "first_light": {
      // Endowed progress: регистрация уже даёт 1/3
      let step = 1
      if (c.hasDraft) step = 2
      if (c.releasedCount >= 1 || unlocked) step = 3
      else if (c.hadModeration) step = Math.max(step, 2)
      return { progressCurrent: step, progressTarget: 3 }
    }
    case "catalog_5":
      return {
        progressCurrent: Math.min(5, c.releasedCount),
        progressTarget: 5,
      }
    case "catalog_25":
      return {
        progressCurrent: Math.min(25, c.releasedCount),
        progressTarget: 25,
      }
    case "year_round":
      return {
        progressCurrent: Math.min(3, c.releaseQuarters),
        progressTarget: 3,
      }
    case "first_royalty":
      return done(c.hasRoyalty)
    case "streams_10k":
      return {
        progressCurrent: Math.min(10_000, c.totalPlays),
        progressTarget: 10_000,
      }
    case "paid_artist":
      return done(c.hasPaidArtist)
    case "link_in_bio":
      return done(c.hasSmartlink)
    case "visual":
      return done(c.hasClip)
    case "studio":
      return done(c.hasStudioTool)
    case "crew_1":
      return {
        progressCurrent: Math.min(1, c.referralPaidCount),
        progressTarget: 1,
      }
    case "crew_5":
      return {
        progressCurrent: Math.min(5, c.referralPaidCount),
        progressTarget: 5,
      }
    default:
      return done(unlocked)
  }
}

export async function getGamificationProgress(userId: string): Promise<GamificationProgress> {
  const unlocked = await listUnlockedIds(userId)
  const counters = await loadAchievementCounters(userId)
  let xp = 0
  const achievements: UserAchievementView[] = ACHIEVEMENTS_CATALOG.map((def) => {
    const row = unlocked.get(def.id)
    const isUnlocked = Boolean(row)
    if (isUnlocked) xp += def.xp
    const progress = progressForAchievement(def.id, isUnlocked, counters)
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      category: def.category,
      rarity: def.rarity,
      xp: def.xp,
      rewardLabel: formatAchievementReward(def.reward),
      unlocked: isUnlocked,
      unlockedAt: row?.unlocked_at ?? null,
      ...progress,
    }
  })
  const unlockedCount = achievements.filter((a) => a.unlocked).length
  return {
    xp,
    level: resolveArtistLevel(xp),
    nextLevel: nextArtistLevel(xp),
    levels: ARTIST_LEVELS,
    unlockedCount,
    totalCount: ACHIEVEMENTS_CATALOG.length,
    achievements,
  }
}

/** Пересчёт ачивок по фактам в БД (релизы, оплаты и т.п.). */
export async function evaluateUserAchievements(userId: string): Promise<string[]> {
  const unlockedNow: string[] = []
  const tryUnlock = async (id: string) => {
    const r = await unlockAchievement(userId, id)
    if (r.unlocked) unlockedNow.push(id)
  }

  const c = await loadAchievementCounters(userId)

  if (c.releasedCount >= 1) await tryUnlock("first_light")
  if (c.releasedCount >= 5) await tryUnlock("catalog_5")
  if (c.releasedCount >= 25) await tryUnlock("catalog_25")
  if (c.releaseQuarters >= 3) await tryUnlock("year_round")
  if (c.hasRoyalty) await tryUnlock("first_royalty")
  if (c.totalPlays >= 10_000) await tryUnlock("streams_10k")
  if (c.hasPaidArtist) await tryUnlock("paid_artist")
  if (c.hasSmartlink) await tryUnlock("link_in_bio")
  if (c.hasClip) await tryUnlock("visual")
  if (c.hasStudioTool) await tryUnlock("studio")
  if (c.referralPaidCount >= 1) await tryUnlock("crew_1")
  if (c.referralPaidCount >= 5) await tryUnlock("crew_5")

  return unlockedNow
}

export async function tryEvaluateAchievements(userId: string | null | undefined): Promise<void> {
  const id = userId?.trim()
  if (!id) return
  try {
    await evaluateUserAchievements(id)
  } catch (e) {
    console.error("[cabinet-achievements] evaluate failed", { userId: id, e })
  }
}
