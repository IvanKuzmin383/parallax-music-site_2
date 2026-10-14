import crypto from "crypto"
import { execute, query, queryOne } from "@/lib/database"
import { roundMoney } from "@/lib/cabinet-balance"

export type CabinetCoupon = {
  id: string
  userId: string
  code: string
  title: string
  percentOff: number | null
  amountOffRub: number | null
  maxDiscountRub: number
  serviceScope: string
  source: string | null
  expiresAt: string | null
  usedAt: string | null
  usedOrderId: string | null
  createdAt: string
}

type CouponRow = {
  id: string
  user_id: string
  code: string
  title: string
  percent_off: number | string | null
  amount_off_rub: number | string | null
  max_discount_rub: number | string
  service_scope: string
  source: string | null
  expires_at: string | null
  used_at: string | null
  used_order_id: string | null
  created_at: string
}

function rowToCoupon(row: CouponRow): CabinetCoupon {
  return {
    id: row.id,
    userId: row.user_id,
    code: row.code,
    title: row.title,
    percentOff: row.percent_off === null || row.percent_off === undefined ? null : Number(row.percent_off),
    amountOffRub:
      row.amount_off_rub === null || row.amount_off_rub === undefined
        ? null
        : Number(row.amount_off_rub),
    maxDiscountRub: Number(row.max_discount_rub) || 0,
    serviceScope: row.service_scope,
    source: row.source,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    usedOrderId: row.used_order_id,
    createdAt: row.created_at,
  }
}

function makeCouponCode(): string {
  return `PX-${crypto.randomBytes(4).toString("hex").toUpperCase()}`
}

export async function createPercentCoupon(params: {
  userId: string
  title: string
  percentOff: number
  maxDiscountRub: number
  serviceScope: string
  daysValid: number
  source?: string
}): Promise<CabinetCoupon> {
  const id = crypto.randomUUID()
  const now = new Date()
  const expires = new Date(now.getTime() + params.daysValid * 24 * 60 * 60 * 1000)
  let code = makeCouponCode()
  for (let i = 0; i < 5; i++) {
    const clash = await queryOne<{ id: string }>(
      `SELECT id FROM cabinet_coupons WHERE code = ? LIMIT 1`,
      [code]
    )
    if (!clash) break
    code = makeCouponCode()
  }
  await execute(
    `
    INSERT INTO cabinet_coupons (
      id, user_id, code, title, percent_off, amount_off_rub, max_discount_rub,
      service_scope, source, expires_at, used_at, used_order_id, created_at
    ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, NULL, NULL, ?)
    `,
    [
      id,
      params.userId,
      code,
      params.title.trim(),
      params.percentOff,
      params.maxDiscountRub,
      params.serviceScope,
      params.source ?? null,
      expires.toISOString(),
      now.toISOString(),
    ]
  )
  return {
    id,
    userId: params.userId,
    code,
    title: params.title.trim(),
    percentOff: params.percentOff,
    amountOffRub: null,
    maxDiscountRub: params.maxDiscountRub,
    serviceScope: params.serviceScope,
    source: params.source ?? null,
    expiresAt: expires.toISOString(),
    usedAt: null,
    usedOrderId: null,
    createdAt: now.toISOString(),
  }
}

export async function listCouponsForUser(
  userId: string,
  opts?: { activeOnly?: boolean }
): Promise<CabinetCoupon[]> {
  const rows = await query<CouponRow>(
    `
    SELECT * FROM cabinet_coupons
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 100
    `,
    [userId]
  )
  const now = Date.now()
  return rows
    .map(rowToCoupon)
    .filter((c) => {
      if (!opts?.activeOnly) return true
      if (c.usedAt) return false
      if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return false
      return true
    })
}

export function couponAppliesToService(coupon: CabinetCoupon, orderType: string): boolean {
  const scope = coupon.serviceScope.trim().toLowerCase()
  if (!scope || scope === "services" || scope === "*") return true
  const allowed = scope.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
  return allowed.includes(orderType.trim().toLowerCase())
}

/** Считает скидку в ₽ с учётом max_discount. */
export function computeCouponDiscountRub(
  coupon: CabinetCoupon,
  orderAmountRub: number
): number {
  const amount = roundMoney(orderAmountRub)
  if (amount <= 0) return 0
  let discount = 0
  if (coupon.percentOff && coupon.percentOff > 0) {
    discount = roundMoney((amount * coupon.percentOff) / 100)
  } else if (coupon.amountOffRub && coupon.amountOffRub > 0) {
    discount = roundMoney(coupon.amountOffRub)
  }
  const cap = roundMoney(coupon.maxDiscountRub)
  if (cap > 0) discount = Math.min(discount, cap)
  return Math.min(discount, amount)
}

export async function getUsableCouponForUser(
  userId: string,
  code: string,
  orderType: string
): Promise<CabinetCoupon | null> {
  const row = await queryOne<CouponRow>(
    `SELECT * FROM cabinet_coupons WHERE user_id = ? AND lower(code) = lower(?) LIMIT 1`,
    [userId, code.trim()]
  )
  if (!row) return null
  const coupon = rowToCoupon(row)
  if (coupon.usedAt) return null
  if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) return null
  if (!couponAppliesToService(coupon, orderType)) return null
  return coupon
}

export async function markCouponUsed(params: {
  couponId: string
  orderId: string
}): Promise<void> {
  await execute(
    `
    UPDATE cabinet_coupons
    SET used_at = ?, used_order_id = ?
    WHERE id = ? AND used_at IS NULL
    `,
    [new Date().toISOString(), params.orderId, params.couponId]
  )
}
