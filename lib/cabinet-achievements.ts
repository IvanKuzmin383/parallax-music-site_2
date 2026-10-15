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
  type ArtistLevel,
} from "@/lib/cabinet/achievements-catalog"
import { getCabinetUserById } from "@/lib/cabinet-users"
import { listReleasesByUserId } from "@/lib/releases"

export type UserAchievementView = {
  id: string
  title: string
  description: string
  category: AchievementDef["category"]
  xp: number
  /** Текст награды для UI, null если только XP */
  rewardLabel: string | null
  unlocked: boolean
  unlockedAt: string | null
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

export async function getGamificationProgress(userId: string): Promise<GamificationProgress> {
  const unlocked = await listUnlockedIds(userId)
  let xp = 0
  const achievements: UserAchievementView[] = ACHIEVEMENTS_CATALOG.map((def) => {
    const row = unlocked.get(def.id)
    if (row) xp += def.xp
    return {
      id: def.id,
      title: def.title,
      description: def.description,
      category: def.category,
      xp: def.xp,
      rewardLabel: formatAchievementReward(def.reward),
      unlocked: Boolean(row),
      unlockedAt: row?.unlocked_at ?? null,
    }
  })
  return {
    xp,
    level: resolveArtistLevel(xp),
    nextLevel: nextArtistLevel(xp),
    levels: ARTIST_LEVELS,
    unlockedCount: unlocked.size,
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

  await tryUnlock("welcome")

  try {
    const user = await getCabinetUserById(userId)
    const byId = await listReleasesByUserId(userId, 300)
    const byEmail =
      user?.email && user.email.toLowerCase() !== userId.toLowerCase()
        ? await listReleasesByUserId(user.email, 300)
        : []
    const seen = new Set<string>()
    const releases = [...byId, ...byEmail].filter((r) => {
      if (seen.has(r.id)) return false
      seen.add(r.id)
      return true
    })
    if (releases.length > 0) await tryUnlock("first_draft")
    const hadModeration = releases.some(
      (r) =>
        r.status === "on_moderation" ||
        r.status === "sent_to_platforms" ||
        r.status === "approved_by_platforms" ||
        r.status === "released"
    )
    if (hadModeration) await tryUnlock("first_moderation")
    const releasedCount = releases.filter((r) => r.status === "released").length
    if (releasedCount >= 1) await tryUnlock("first_released")
    if (releasedCount >= 3) await tryUnlock("releases_3")
    if (releasedCount >= 10) await tryUnlock("releases_10")
  } catch (e) {
    console.error("[cabinet-achievements] releases eval failed", { userId, e })
  }

  try {
    const topup = await queryOne<{ id: string }>(
      `
      SELECT id FROM cabinet_balance_transactions
      WHERE user_id = ? AND type = 'topup'
      LIMIT 1
      `,
      [userId]
    )
    if (topup) await tryUnlock("first_wallet_topup")
  } catch {
    // ignore
  }

  try {
    const servicePaid = await queryOne<{ id: string }>(
      `
      SELECT id FROM orders
      WHERE user_id = ?
        AND status = 'paid'
        AND order_type IN (
          'ai_mastering','vertical_video','track_cover','ai_cover',
          'yandex_videoshot','yandex_videoshot_creation','yandex_videoavatar',
          'spotify_videoshot','business_music','music_video','lyrics_sync','upload_addon_bundle'
        )
      LIMIT 1
      `,
      [userId]
    )
    if (servicePaid) await tryUnlock("first_service")
  } catch {
    // ignore
  }

  try {
    const clip = await queryOne<{ id: string }>(
      `SELECT id FROM video_clips WHERE user_id = ? LIMIT 1`,
      [userId]
    )
    if (clip) await tryUnlock("first_music_video")
  } catch {
    // ignore
  }

  try {
    const pub = await queryOne<{ id: string }>(
      `SELECT id FROM publicka_placements WHERE user_id = ? LIMIT 1`,
      [userId]
    )
    if (pub) await tryUnlock("first_publicka")
  } catch {
    // ignore
  }

  try {
    const refCount = await queryOne<{ c: number | string }>(
      `
      SELECT COUNT(*)::int AS c FROM cabinet_referral_rewards
      WHERE referrer_user_id = ?
      `,
      [userId]
    )
    const n = Number(refCount?.c) || 0
    if (n >= 1) await tryUnlock("referral_1")
    if (n >= 3) await tryUnlock("referral_3")
  } catch {
    // ignore
  }

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
