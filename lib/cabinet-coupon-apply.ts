import {
  computeCouponDiscountRub,
  couponAppliesToService,
  getUsableCouponForUser,
  listCouponsForUser,
  markCouponUsed,
  type CabinetCoupon,
} from "@/lib/cabinet-coupons"
import { roundMoney } from "@/lib/cabinet-balance"
import type { OrderServiceDetails } from "@/lib/order-service-details"

export type CouponPricingResult = {
  amountRub: number
  discountRub: number
  coupon: CabinetCoupon | null
  error?: string
}

/** Лучший активный купон пользователя под услугу (макс. скидка в ₽). */
export async function findBestCouponForOrder(params: {
  userId: string
  orderType: string
  amountRub: number
}): Promise<{ coupon: CabinetCoupon; discountRub: number } | null> {
  const base = roundMoney(params.amountRub)
  if (base <= 0) return null
  const active = await listCouponsForUser(params.userId, { activeOnly: true })
  let best: { coupon: CabinetCoupon; discountRub: number } | null = null
  for (const coupon of active) {
    if (!couponAppliesToService(coupon, params.orderType)) continue
    const discountRub = computeCouponDiscountRub(coupon, base)
    if (discountRub <= 0) continue
    if (!best || discountRub > best.discountRub) {
      best = { coupon, discountRub }
    }
  }
  return best
}

/** Применяет купон по коду или (если autoApplyBest) лучший подходящий. */
export async function applyCouponToOrderAmount(params: {
  userId: string
  orderType: string
  amountRub: number
  couponCode?: string | null
  autoApplyBest?: boolean
}): Promise<CouponPricingResult> {
  const base = roundMoney(params.amountRub)
  const code = params.couponCode?.trim()

  if (!code && !params.autoApplyBest) {
    return { amountRub: base, discountRub: 0, coupon: null }
  }

  if (code) {
    const coupon = await getUsableCouponForUser(params.userId, code, params.orderType)
    if (!coupon) {
      return {
        amountRub: base,
        discountRub: 0,
        coupon: null,
        error: "Купон недействителен или не подходит к этой услуге",
      }
    }
    const discountRub = computeCouponDiscountRub(coupon, base)
    return {
      amountRub: roundMoney(Math.max(0, base - discountRub)),
      discountRub,
      coupon,
    }
  }

  const best = await findBestCouponForOrder({
    userId: params.userId,
    orderType: params.orderType,
    amountRub: base,
  })
  if (!best) {
    // Кнопка нажали, но купон уже сгорел - оплачиваем полную сумму без ошибки
    return { amountRub: base, discountRub: 0, coupon: null }
  }
  return {
    amountRub: roundMoney(Math.max(0, base - best.discountRub)),
    discountRub: best.discountRub,
    coupon: best.coupon,
  }
}

/** Читает applyCoupon / couponCode из body оплаты. */
export async function resolveCouponPricingFromBody(params: {
  userId: string
  orderType: string
  amountRub: number
  body: Record<string, unknown>
}): Promise<CouponPricingResult> {
  const applyCoupon = params.body.applyCoupon === true
  const couponCode =
    typeof params.body.couponCode === "string" ? params.body.couponCode.trim() : ""
  if (!applyCoupon && !couponCode) {
    return { amountRub: roundMoney(params.amountRub), discountRub: 0, coupon: null }
  }
  return applyCouponToOrderAmount({
    userId: params.userId,
    orderType: params.orderType,
    amountRub: params.amountRub,
    couponCode: couponCode || null,
    autoApplyBest: applyCoupon && !couponCode,
  })
}

export function couponServiceDetailsFromPricing(
  priced: CouponPricingResult
): Pick<
  OrderServiceDetails,
  "couponCode" | "couponId" | "couponTitle" | "couponDiscountRub"
> {
  if (!priced.coupon) return {}
  return {
    couponCode: priced.coupon.code,
    couponId: priced.coupon.id,
    couponTitle: priced.coupon.title,
    couponDiscountRub: priced.discountRub,
  }
}

export async function consumeCouponAfterOrder(params: {
  coupon: CabinetCoupon | null
  orderId: string
}): Promise<void> {
  if (!params.coupon) return
  await markCouponUsed({ couponId: params.coupon.id, orderId: params.orderId })
}
