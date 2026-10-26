import { getOrderById, type OrderSubscription } from "@/lib/orders"
import { fulfillSubscriptionOrder } from "@/lib/fulfill-subscription-order"

async function main() {
  const orderId = "09ed230a-fa15-4a70-88ee-4083afbebbd7"
  const paymentId = "9513192631"
  const order = await getOrderById(orderId)
  if (!order) throw new Error("order not found")
  if (order.status === "paid") {
    console.log("already paid")
    return
  }
  if (order.orderType !== "subscription") throw new Error(`unexpected type ${order.orderType}`)
  await fulfillSubscriptionOrder({
    order: order as OrderSubscription,
    paymentId,
    paidAt: new Date().toISOString(),
    amountRub: order.totalAmount,
    provider: "tbank",
  })
  const after = await getOrderById(orderId)
  console.log("done", { status: after?.status, paidAt: after?.paidAt, paymentId: after?.paymentId, email: after?.userEmail })
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
