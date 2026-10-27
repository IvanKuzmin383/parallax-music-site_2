import { NextResponse } from "next/server"
import { debitWalletForServicePayment } from "@/lib/cabinet-balance"
import { fulfillPaidOrder } from "@/lib/fulfill-paid-order"
import { updateOrderStatus, type Order } from "@/lib/orders"

export function isPayFromBalance(body: Record<string, unknown>): boolean {
  return body.payFromBalance === true
}

/**
 * Кабинет: услуги оплачиваются только с баланса.
 * Карта (T-Bank) - только для пополнения баланса (wallet_topup).
 */
export async function respondWithWalletPayment(order: Order) {
  const paid = await payOrderFromWallet(order)
  if (!paid.ok) {
    return NextResponse.json({ error: paid.error }, { status: paid.status })
  }
  return NextResponse.json({
    paid: true,
    orderId: paid.orderId,
    paymentId: paid.paymentId,
    walletBalance: paid.walletBalance,
  })
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
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, error: "Некорректная сумма заказа", status: 400 }
  }

  const paidAt = new Date().toISOString()

  // 100% купон: заказ 0 ₽ - fulfillment без списания с баланса
  if (amount === 0) {
    const paymentId = `wallet:coupon:${order.id}`
    try {
      await fulfillPaidOrder({
        order,
        paymentId,
        paidAt,
        amountRub: "0.00",
        provider: "wallet",
      })
    } catch (error) {
      console.error("[cabinet-wallet-pay] free coupon fulfill failed", {
        orderId: order.id,
        error,
      })
      return {
        ok: false,
        error: "Не удалось подтвердить бесплатный заказ. Напишите в поддержку.",
        status: 500,
      }
    }
    let walletBalance = 0
    try {
      const { getCabinetUserById } = await import("@/lib/cabinet-users")
      const user = await getCabinetUserById(order.userId)
      walletBalance = Number(user?.walletBalance) || 0
    } catch {
      /* ignore */
    }
    return { ok: true, orderId: order.id, paymentId, walletBalance }
  }

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
