import crypto from "crypto"
import { query, queryOne, execute } from "./database"

export type WithdrawalStatus = "pending" | "rejected" | "completed"

export interface WithdrawalRequest {
  id: string
  userId: string
  amount: number
  type: "sbp" | "card"
  phone?: string
  cardNumber?: string
  bank?: string
  recipientName: string
  status: WithdrawalStatus
  createdAt: string
  updatedAt: string
}

interface WithdrawalRequestRow {
  id: string
  user_id: string
  amount: number
  type: string
  phone: string | null
  card_number: string | null
  bank: string | null
  recipient_name: string
  status: string
  created_at: string
  updated_at: string
}

function rowToWithdrawal(row: WithdrawalRequestRow): WithdrawalRequest {
  return {
    id: row.id,
    userId: row.user_id,
    amount: row.amount,
    type: row.type as "sbp" | "card",
    phone: row.phone ?? undefined,
    cardNumber: row.card_number ?? undefined,
    bank: row.bank ?? undefined,
    recipientName: row.recipient_name,
    status: row.status as WithdrawalStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function getAllWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const rows = await query<WithdrawalRequestRow>("SELECT * FROM withdrawal_requests")
  return rows.map(rowToWithdrawal)
}

export async function getWithdrawalRequestsByUserId(userId: string): Promise<WithdrawalRequest[]> {
  const rows = await query<WithdrawalRequestRow>("SELECT * FROM withdrawal_requests WHERE user_id = ?", [userId])
  return rows.map(rowToWithdrawal)
}

export async function getWithdrawalRequestById(id: string): Promise<WithdrawalRequest | null> {
  const row = await queryOne<WithdrawalRequestRow>("SELECT * FROM withdrawal_requests WHERE id = ?", [id])
  return row ? rowToWithdrawal(row) : null
}

export async function createWithdrawalRequest(
  userId: string,
  amount: number,
  type: "sbp" | "card",
  recipientName: string,
  phone?: string,
  cardNumber?: string,
  bank?: string
): Promise<WithdrawalRequest> {
  const now = new Date().toISOString()
  const id = crypto.randomUUID()

  await execute(
    `
    INSERT INTO withdrawal_requests (id, user_id, amount, type, phone, card_number, bank, recipient_name, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `,
    [id, userId, amount, type, phone ?? null, cardNumber ?? null, bank ?? null, recipientName, now, now]
  )

  if (process.env.NODE_ENV === "development") {
    console.log("[withdrawal-requests] Created withdrawal request", { id, userId, amount, type })
  }

  return (await getWithdrawalRequestById(id)) as WithdrawalRequest
}

export async function updateWithdrawalRequestStatus(
  id: string,
  status: WithdrawalStatus
): Promise<WithdrawalRequest | null> {
  const current = await getWithdrawalRequestById(id)
  if (!current) return null

  const now = new Date().toISOString()
  await execute("UPDATE withdrawal_requests SET status = ?, updated_at = ? WHERE id = ?", [status, now, id])

  if (process.env.NODE_ENV === "development") {
    console.log("[withdrawal-requests] Updated withdrawal request status", { id, status })
  }

  return getWithdrawalRequestById(id)
}

export async function deleteWithdrawalRequest(id: string): Promise<boolean> {
  const changes = await execute("DELETE FROM withdrawal_requests WHERE id = ?", [id])

  if (process.env.NODE_ENV === "development" && changes > 0) {
    console.log("[withdrawal-requests] Deleted withdrawal request", { id })
  }

  return changes > 0
}
