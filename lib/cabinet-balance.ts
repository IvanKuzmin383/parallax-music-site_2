import crypto from "crypto"
import {
  clientExecute,
  clientQuery,
  query,
  withTransaction,
} from "@/lib/database"
import { getCabinetUserByEmail, getCabinetUserById } from "@/lib/cabinet-users"

export type BalanceTransactionType =
  | "royalty_to_wallet"
  | "royalty_credit"
  | "withdrawal"
  | "topup"
  | "service_payment"
  | "refund"
  | "referral_bonus"

export type BalanceTransaction = {
  id: string
  userId: string
  type: BalanceTransactionType | string
  amount: number
  royaltyDelta: number
  walletDelta: number
  note: string | null
  createdAt: string
}

export const BALANCE_TRANSACTION_LABELS: Record<string, string> = {
  royalty_to_wallet: "Перевод роялти на баланс",
  royalty_credit: "Начисление роялти",
  withdrawal: "Вывод роялти",
  topup: "Пополнение",
  service_payment: "Оплата услуги",
  refund: "Возврат",
  referral_bonus: "Партнёрский бонус",
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

type TxRow = {
  id: string
  user_id: string
  type: string
  amount: number | string
  royalty_delta: number | string
  wallet_delta: number | string
  note: string | null
  created_at: string
}

function rowToTx(row: TxRow): BalanceTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: Number(row.amount) || 0,
    royaltyDelta: Number(row.royalty_delta) || 0,
    walletDelta: Number(row.wallet_delta) || 0,
    note: row.note,
    createdAt: row.created_at,
  }
}

export async function listBalanceTransactions(
  userId: string,
  limit = 50
): Promise<BalanceTransaction[]> {
  const rows = await query<TxRow>(
    `
    SELECT * FROM cabinet_balance_transactions
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
    `,
    [userId, Math.max(1, Math.min(limit, 200))]
  )
  return rows.map(rowToTx)
}

export type TransferRoyaltyResult =
  | {
      ok: true
      amount: number
      streamingBalance: number
      walletBalance: number
      transaction: BalanceTransaction
    }
  | { ok: false; error: string; status: number }

/**
 * Перевод с роялти (streaming_balance) на баланс кабинета (wallet_balance).
 */
export async function transferRoyaltyToWallet(params: {
  userEmail: string
  amount: number
}): Promise<TransferRoyaltyResult> {
  const user = await getCabinetUserByEmail(params.userEmail)
  if (!user) return { ok: false, error: "Пользователь не найден", status: 404 }

  const amount = roundMoney(params.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Укажите сумму больше 0", status: 400 }
  }

  try {
    const result = await withTransaction(async (client) => {
      const rows = await clientQuery<{
        streaming_balance: number | string | null
        wallet_balance: number | string | null
      }>(
        client,
        `
        SELECT streaming_balance, wallet_balance
        FROM cabinet_users
        WHERE id = ?
        FOR UPDATE
        `,
        [user.id]
      )
      const row = rows[0]
      if (!row) throw new Error("USER_NOT_FOUND")

      const royalty = roundMoney(Number(row.streaming_balance) || 0)
      const wallet = roundMoney(Number(row.wallet_balance) || 0)
      if (amount > royalty) {
        const err = new Error("INSUFFICIENT_ROYALTY")
        ;(err as Error & { royalty: number }).royalty = royalty
        throw err
      }

      const nextRoyalty = roundMoney(royalty - amount)
      const nextWallet = roundMoney(wallet + amount)
      const now = new Date().toISOString()
      const txId = crypto.randomUUID()

      await clientExecute(
        client,
        `
        UPDATE cabinet_users
        SET streaming_balance = ?, wallet_balance = ?
        WHERE id = ?
        `,
        [nextRoyalty, nextWallet, user.id]
      )

      await clientExecute(
        client,
        `
        INSERT INTO cabinet_balance_transactions (
          id, user_id, type, amount, royalty_delta, wallet_delta, note, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          txId,
          user.id,
          "royalty_to_wallet",
          amount,
          -amount,
          amount,
          "Перевод роялти на баланс",
          now,
        ]
      )

      return {
        amount,
        streamingBalance: nextRoyalty,
        walletBalance: nextWallet,
        transaction: {
          id: txId,
          userId: user.id,
          type: "royalty_to_wallet" as const,
          amount,
          royaltyDelta: -amount,
          walletDelta: amount,
          note: "Перевод роялти на баланс",
          createdAt: now,
        },
      }
    })

    const { tryNotifyRoyaltyToWallet } = await import("@/lib/cabinet-notifications")
    await tryNotifyRoyaltyToWallet({ userId: user.id, amount: result.amount })

    return { ok: true, ...result }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_ROYALTY") {
        const royalty = (error as Error & { royalty?: number }).royalty
        return {
          ok: false,
          error:
            royalty != null
              ? `Недостаточно роялти (доступно ${royalty.toLocaleString("ru-RU")} ₽)`
              : "Недостаточно роялти",
          status: 400,
        }
      }
      if (error.message === "USER_NOT_FOUND") {
        return { ok: false, error: "Пользователь не найден", status: 404 }
      }
    }
    console.error("[cabinet-balance] transferRoyaltyToWallet failed:", error)
    return { ok: false, error: "Не удалось выполнить перевод", status: 500 }
  }
}

export async function getUserBalancesByEmail(email: string): Promise<{
  streamingBalance: number
  walletBalance: number
} | null> {
  const user = await getCabinetUserByEmail(email)
  if (!user) return null
  const fresh = await getCabinetUserById(user.id)
  if (!fresh) return null
  return {
    streamingBalance: roundMoney(fresh.streamingBalance ?? 0),
    walletBalance: roundMoney(fresh.walletBalance ?? 0),
  }
}
