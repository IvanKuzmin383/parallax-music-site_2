import type { FulfillFixPackOrderParams } from "@/lib/fulfill-fix-pack-order"
import type { FulfillPaidOrderParams } from "@/lib/fulfill-paid-order"
import type { Order } from "@/lib/orders"

export type WalletFulfillmentTarget = "fix_pack" | "generic"

/** Какой fulfill вызывать после списания с баланса. fix_pack нельзя отдавать в fulfillPaidOrder. */
export function walletFulfillmentTarget(orderType: Order["orderType"]): WalletFulfillmentTarget {
  return orderType === "fix_pack" ? "fix_pack" : "generic"
}

type WalletFulfillParams = {
  order: Order
  paymentId: string
  paidAt: string
  amountRub: string
}

export type WalletFulfillDeps = {
  fulfillFixPack: (params: FulfillFixPackOrderParams) => Promise<void>
  fulfillGeneric: (params: FulfillPaidOrderParams) => Promise<void>
}

async function defaultDeps(): Promise<WalletFulfillDeps> {
  const [{ fulfillFixPackOrder }, { fulfillPaidOrder }] = await Promise.all([
    import("@/lib/fulfill-fix-pack-order"),
    import("@/lib/fulfill-paid-order"),
  ])
  return { fulfillFixPack: fulfillFixPackOrder, fulfillGeneric: fulfillPaidOrder }
}

/** После успешного списания с баланса: начислить треки Fix или выполнить обычный fulfill. */
export async function fulfillWalletPaidOrder(
  params: WalletFulfillParams,
  deps?: WalletFulfillDeps,
): Promise<WalletFulfillmentTarget> {
  const { order, paymentId, paidAt, amountRub } = params
  const resolved = deps ?? (await defaultDeps())
  const target = walletFulfillmentTarget(order.orderType)
  if (target === "fix_pack") {
    if (order.orderType !== "fix_pack") {
      throw new Error("walletFulfillmentTarget mismatch")
    }
    await resolved.fulfillFixPack({
      order,
      paymentId,
      paidAt,
      amountRub,
      provider: "wallet",
    })
    return target
  }
  await resolved.fulfillGeneric({
    order,
    paymentId,
    paidAt,
    amountRub,
    provider: "wallet",
  })
  return target
}
