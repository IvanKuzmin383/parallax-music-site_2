import crypto from "crypto"
import { execute, query, queryOne } from "@/lib/database"
import { creditWalletBonus, roundMoney } from "@/lib/cabinet-balance"
import { tryEvaluateAchievements } from "@/lib/cabinet-achievements"
import { tryCreateCabinetNotification } from "@/lib/cabinet-notifications"
import { getCabinetUserById } from "@/lib/cabinet-users"
import { GAMIFICATION_ECONOMY } from "@/lib/cabinet/achievements-catalog"
import type { Order, OrderType } from "@/lib/orders"

export { REFERRAL_COOKIE_NAME } from "@/lib/cabinet/referral-cookie"

/** Подписки, тарифы загрузки и инструменты - без продвижения и пополнения кошелька. */
export const REFERRAL_ELIGIBLE_ORDER_TYPES = [
  "subscription",
  "fix_pack",
  "tracks_topup",
  "tools_mastering_download",
  "tools_story_video_download",
  "tools_slowed_reverb_download",
  "tools_smartlink",
] as const satisfies readonly OrderType[]

const REFERRAL_ELIGIBLE_SET = new Set<string>(REFERRAL_ELIGIBLE_ORDER_TYPES)

export function isReferralEligibleOrderType(orderType: string): boolean {
  return REFERRAL_ELIGIBLE_SET.has(orderType)
}

export type ReferralStats = {
  referralCode: string
  referralLink: string
  invitedCount: number
  paidReferrals: number
  earnedRub: number
  rows: Array<{
    userId: string
    emailMasked: string
    artistName: string | null
    registeredAt: string
    rewardedRub: number | null
  }>
}

function sanitizeReferralBase(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "")
    .slice(0, 24)
  return cleaned || "artist"
}

export async function ensureReferralCode(userId: string, email: string): Promise<string> {
  const user = await getCabinetUserById(userId)
  if (!user) throw new Error("USER_NOT_FOUND")
  const existing = await queryOne<{ referral_code: string | null }>(
    `SELECT referral_code FROM cabinet_users WHERE id = ?`,
    [userId]
  )
  if (existing?.referral_code?.trim()) return existing.referral_code.trim()

  const local = email.split("@")[0] || "artist"
  let base = sanitizeReferralBase(local)
  let code = base
  for (let i = 0; i < 8; i++) {
    const clash = await queryOne<{ id: string }>(
      `SELECT id FROM cabinet_users WHERE lower(referral_code) = lower(?) AND id <> ? LIMIT 1`,
      [code, userId]
    )
    if (!clash) {
      await execute(`UPDATE cabinet_users SET referral_code = ? WHERE id = ?`, [code, userId])
      return code
    }
    code = `${base}${crypto.randomBytes(2).toString("hex")}`
  }
  code = `u${userId.replace(/-/g, "").slice(0, 10)}`
  await execute(`UPDATE cabinet_users SET referral_code = ? WHERE id = ?`, [code, userId])
  return code
}

export async function findUserIdByReferralCode(code: string): Promise<string | null> {
  const raw = code.trim()
  if (!raw || raw.length > 40) return null
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM cabinet_users WHERE lower(referral_code) = lower(?) AND COALESCE(is_disabled, false) = false LIMIT 1`,
    [raw]
  )
  return row?.id ?? null
}

export async function attachReferrerOnRegister(params: {
  userId: string
  referralCode?: string | null
}): Promise<void> {
  const code = params.referralCode?.trim()
  if (!code) return
  const referrerId = await findUserIdByReferralCode(code)
  if (!referrerId || referrerId === params.userId) return

  await execute(
    `
    UPDATE cabinet_users
    SET referred_by_user_id = COALESCE(referred_by_user_id, ?)
    WHERE id = ? AND referred_by_user_id IS NULL
    `,
    [referrerId, params.userId]
  )
}

function orderAmountRub(order: Order): number {
  const raw = Number(order.totalAmount)
  return Number.isFinite(raw) ? roundMoney(raw) : 0
}

/**
 * 5% с подходящих оплат приглашённого (подписки / тарифы / инструменты),
 * без продвижения и без оплат с баланса кошелька.
 * Суммарный потолок на одного реферала - referralPerInviteeCapRub.
 */
export async function tryGrantReferralPaymentBonus(params: {
  referredUserId: string
  order: Order
  /** wallet = оплата с баланса - не начисляем */
  provider?: "tbank" | "yookassa" | "wallet"
}): Promise<{ granted: boolean; amount: number }> {
  if (params.provider === "wallet") return { granted: false, amount: 0 }
  if (!isReferralEligibleOrderType(params.order.orderType)) {
    return { granted: false, amount: 0 }
  }

  const referred = await queryOne<{
    id: string
    referred_by_user_id: string | null
  }>(`SELECT id, referred_by_user_id FROM cabinet_users WHERE id = ?`, [params.referredUserId])
  const referrerId = referred?.referred_by_user_id?.trim()
  if (!referrerId || referrerId === params.referredUserId) {
    return { granted: false, amount: 0 }
  }

  const paid = orderAmountRub(params.order)
  if (paid <= 0) return { granted: false, amount: 0 }

  const alreadyForOrder = await queryOne<{ id: string }>(
    `SELECT id FROM cabinet_referral_rewards WHERE order_id = ? LIMIT 1`,
    [params.order.id]
  )
  if (alreadyForOrder) return { granted: false, amount: 0 }

  const earnedRow = await queryOne<{ s: number | string | null }>(
    `
    SELECT COALESCE(SUM(amount_rub), 0) AS s
    FROM cabinet_referral_rewards
    WHERE referred_user_id = ?
    `,
    [params.referredUserId]
  )
  const alreadyEarned = roundMoney(Number(earnedRow?.s) || 0)
  const cap = GAMIFICATION_ECONOMY.referralPerInviteeCapRub
  const remaining = roundMoney(cap - alreadyEarned)
  if (remaining <= 0) return { granted: false, amount: 0 }

  const percent = GAMIFICATION_ECONOMY.referralPaymentPercent
  const amount = Math.min(roundMoney((paid * percent) / 100), remaining)
  if (amount <= 0) return { granted: false, amount: 0 }

  const rewardId = crypto.randomUUID()
  const now = new Date().toISOString()
  try {
    await execute(
      `
      INSERT INTO cabinet_referral_rewards (
        id, referrer_user_id, referred_user_id, order_id, amount_rub, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [rewardId, referrerId, params.referredUserId, params.order.id, amount, now]
    )
  } catch {
    // unique race по order_id
    return { granted: false, amount: 0 }
  }

  const credited = await creditWalletBonus({
    userId: referrerId,
    amount,
    type: "referral_bonus",
    note: `Партнёрский бонус ${percent}% за оплату реферала (заказ ${params.order.id})`,
    idempotencyToken: `ref-order:${params.order.id}`,
  })

  if (!credited.ok) {
    console.error("[cabinet-referrals] credit failed", credited.error)
  } else if (credited.transaction.id !== "existing") {
    await tryCreateCabinetNotification({
      userId: referrerId,
      type: "referral_bonus",
      title: "Партнёрский бонус",
      body: `Начислено ${amount.toLocaleString("ru-RU")} ₽ за оплату приглашённого артиста`,
      href: "/cabinet/referrals",
      entityType: "referral_reward",
      entityId: rewardId,
    })
    await tryEvaluateAchievements(referrerId)
  }

  return { granted: credited.ok, amount }
}

/** @deprecated имя для совместимости - см. tryGrantReferralPaymentBonus */
export async function tryGrantReferralFirstPaymentBonus(params: {
  referredUserId: string
  order: Order
  provider?: "tbank" | "yookassa" | "wallet"
}): Promise<{ granted: boolean; amount: number }> {
  return tryGrantReferralPaymentBonus(params)
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return "***"
  const head = local?.slice(0, 2) || ""
  return `${head}***@${domain}`
}

export async function getReferralStats(
  userId: string,
  siteOrigin: string
): Promise<ReferralStats> {
  const user = await getCabinetUserById(userId)
  if (!user) {
    return {
      referralCode: "",
      referralLink: `${siteOrigin}/?ref=`,
      invitedCount: 0,
      paidReferrals: 0,
      earnedRub: 0,
      rows: [],
    }
  }
  const code = await ensureReferralCode(userId, user.email)
  const invited = await query<{
    id: string
    email: string
    artist_name: string | null
    created_at: string
  }>(
    `
    SELECT id, email, artist_name, created_at
    FROM cabinet_users
    WHERE referred_by_user_id = ?
    ORDER BY created_at DESC
    LIMIT 100
    `,
    [userId]
  )
  const rewards = await query<{
    referred_user_id: string
    amount_rub: number | string
  }>(
    `SELECT referred_user_id, amount_rub FROM cabinet_referral_rewards WHERE referrer_user_id = ?`,
    [userId]
  )
  const rewardByUser = new Map<string, number>()
  for (const r of rewards) {
    const prev = rewardByUser.get(r.referred_user_id) ?? 0
    rewardByUser.set(
      r.referred_user_id,
      roundMoney(prev + (Number(r.amount_rub) || 0))
    )
  }
  const earnedRub = roundMoney(
    [...rewardByUser.values()].reduce((sum, v) => sum + v, 0)
  )

  return {
    referralCode: code,
    referralLink: `${siteOrigin.replace(/\/$/, "")}/?ref=${encodeURIComponent(code)}`,
    invitedCount: invited.length,
    paidReferrals: rewardByUser.size,
    earnedRub,
    rows: invited.map((row) => ({
      userId: row.id,
      emailMasked: maskEmail(row.email),
      artistName: row.artist_name,
      registeredAt: row.created_at,
      rewardedRub: rewardByUser.get(row.id) ?? null,
    })),
  }
}
