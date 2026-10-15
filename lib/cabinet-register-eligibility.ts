import { getLastCabinetUserDeletionAt } from "@/lib/cabinet-users"
import { sumPendingFixCredits } from "@/lib/pending-fix-credits"
import { getPaidFixPackOrdersByEmail, getPaidOrdersByEmail, type Order, type OrderFixPack } from "@/lib/orders"
import { isPlanId, type PlanId } from "@/lib/plan-pricing"
import type { OrderSubscription } from "@/lib/orders"

function filterOrdersAfterDeletion<T extends { paidAt?: string; createdAt: string }>(
  orders: T[],
  deletedAt: string | null
): T[] {
  if (!deletedAt) return orders
  return orders.filter((order) => {
    const orderDateRaw = order.paidAt ?? order.createdAt
    const orderDateTs = Date.parse(orderDateRaw)
    const deletedAtTs = Date.parse(deletedAt)
    if (Number.isNaN(orderDateTs) || Number.isNaN(deletedAtTs)) return false
    return orderDateTs > deletedAtTs
  })
}

export function isPaidSubscriptionOrder(
  order: Order
): order is OrderSubscription & { planId: PlanId } {
  return order.orderType === "subscription" && isPlanId(order.planId)
}

export type RegisterEligibility =
  | {
      ok: true
      email: string
      eligiblePaidSubscriptions: Order[]
      eligiblePaidFixPacks: OrderFixPack[]
      hasPaidSubscription: boolean
      hasPaidFixPack: boolean
    }
  | {
      ok: false
      status: 403
      error: string
      code: "PAYMENT_CONFLICT"
    }

/**
 * Регистрация свободна. Если на email уже есть оплата - привяжем при создании аккаунта.
 * Конфликт только если одновременно и подписка, и Fix.
 */
export async function checkCabinetRegisterEligibility(email: string): Promise<RegisterEligibility> {
  const normalized = email.trim().toLowerCase()
  const deletedAt = await getLastCabinetUserDeletionAt(normalized)
  const eligiblePaidSubscriptions = filterOrdersAfterDeletion(
    await getPaidOrdersByEmail(normalized),
    deletedAt
  )
  const eligiblePaidFixPacks = filterOrdersAfterDeletion(
    await getPaidFixPackOrdersByEmail(normalized),
    deletedAt
  ) as OrderFixPack[]

  const hasPaidSubscription = eligiblePaidSubscriptions.some(
    (o) => o.orderType === "subscription" && isPlanId(o.planId)
  )
  const hasPaidFixPack =
    eligiblePaidFixPacks.length > 0 || (await sumPendingFixCredits(normalized)) > 0

  if (hasPaidSubscription && hasPaidFixPack) {
    return {
      ok: false,
      status: 403,
      error:
        "На этот email найдены и подписка, и оплата Fix. Обратитесь в поддержку для привязки аккаунта.",
      code: "PAYMENT_CONFLICT",
    }
  }

  return {
    ok: true,
    email: normalized,
    eligiblePaidSubscriptions,
    eligiblePaidFixPacks,
    hasPaidSubscription,
    hasPaidFixPack,
  }
}
