import { debitWalletForServicePayment } from "@/lib/cabinet-balance"
import { fulfillPaidOrder } from "@/lib/fulfill-paid-order"
import { updateOrderStatus, type Order } from "@/lib/orders"

export function isPayFromBalance(body: Record<string, unknown>): boolean {
  return body.payFromBalance === true
}

export type PayOrderFromWalletResult =
  | { ok: true; orderId: string; paymentId: string; walletBalance: number }
  | { ok: false; error: string; status: number }

/** Списать сумму заказа с баланса кабинета и выполнить fulfillment как после оплаты. */
export async function payOrderFromWallet(order: Order): Promise<PayOrderFromWalletResult> {
  if (!("userId" in order) || !order.userId) {
    return { ok: false, error: "Заказ без пользователя", status: 400 }
  }
  if (order.status === "paid") {
    return {
      ok: true,
      orderId: order.id,
      paymentId: order.paymentId || `wallet:existing:${order.id}`,
      walletBalance: 0,
    }
  }

  const amount = Number(order.totalAmount)
  const debit = await debitWalletForServicePayment({
    userId: order.userId,
    amount,
    orderId: order.id,
  })
  if (!debit.ok) {
    try {
      await updateOrderStatus(order.id, "failed")
    } catch {
      /* ignore */
    }
    return { ok: false, error: debit.error, status: debit.status }
  }

  const paymentId = `wallet:${debit.transaction.id}`
  const paidAt = new Date().toISOString()

  try {
    await fulfillPaidOrder({
      order,
      paymentId,
      paidAt,
      amountRub: order.totalAmount,
      provider: "wallet",
    })
  } catch (error) {
    console.error("[cabinet-wallet-pay] fulfillPaidOrder failed after debit", {
      orderId: order.id,
      error,
    })
    return { ok: false, error: "Оплата списана, но заказ не удалось подтвердить. Напишите в поддержку.", status: 500 }
  }

  return {
    ok: true,
    orderId: order.id,
    paymentId,
    walletBalance: debit.walletBalance,
  }
}
