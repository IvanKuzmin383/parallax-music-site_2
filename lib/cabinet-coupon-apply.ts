import {
  computeCouponDiscountRub,
  getUsableCouponForUser,
  markCouponUsed,
  type CabinetCoupon,
} from "@/lib/cabinet-coupons"
import { roundMoney } from "@/lib/cabinet-balance"

/** Применяет купон к сумме заказа. Возвращает итоговую сумму и купон (если ок). */
export async function applyCouponToOrderAmount(params: {
  userId: string
  orderType: string
  amountRub: number
  couponCode?: string | null
}): Promise<{
  amountRub: number
  discountRub: number
  coupon: CabinetCoupon | null
  error?: string
}> {
  const base = roundMoney(params.amountRub)
  const code = params.couponCode?.trim()
  if (!code) {
    return { amountRub: base, discountRub: 0, coupon: null }
  }

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
  const amountRub = roundMoney(Math.max(0, base - discountRub))
  return { amountRub, discountRub, coupon }
}

export async function consumeCouponAfterOrder(params: {
  coupon: CabinetCoupon | null
  orderId: string
}): Promise<void> {
  if (!params.coupon) return
  await markCouponUsed({ couponId: params.coupon.id, orderId: params.orderId })
}
