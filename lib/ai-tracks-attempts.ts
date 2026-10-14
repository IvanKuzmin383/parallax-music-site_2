import crypto from "crypto"
import {
  clientExecute,
  clientQuery,
  queryOne,
  withTransaction,
} from "@/lib/database"

export type AttemptOpKind = "reserve" | "commit" | "refund"

export type AttemptBalance = {
  attempts: number
}

/** Абстракция для PG и in-memory тестов. */
export type AttemptLedgerStore = {
  getBalanceForUpdate: (userId: string) => Promise<number | null>
  setBalance: (userId: string, attempts: number) => Promise<void>
  findOp: (jobId: string, kind: AttemptOpKind) => Promise<{ id: string; amount: number } | null>
  insertOp: (input: {
    id: string
    userId: string
    jobId: string
    kind: AttemptOpKind
    amount: number
  }) => Promise<"inserted" | "duplicate">
}

export type ReserveResult =
  | { ok: true; attempts: number; amount: number; already?: boolean }
  | { ok: false; error: "insufficient" | "user_not_found"; attempts: number }

export type CommitOrRefundResult =
  | { ok: true; attempts: number; amount: number; already?: boolean }
  | { ok: false; error: "no_reserve" | "user_not_found"; attempts: number }

export async function runReserveAttempt(
  store: AttemptLedgerStore,
  userId: string,
  jobId: string,
  amount: number
): Promise<ReserveResult> {
  const amt = Math.max(1, Math.floor(amount))
  const existing = await store.findOp(jobId, "reserve")
  if (existing) {
    const balance = await store.getBalanceForUpdate(userId)
    return { ok: true, attempts: Math.max(0, balance ?? 0), amount: existing.amount, already: true }
  }

  const balance = await store.getBalanceForUpdate(userId)
  if (balance == null) return { ok: false, error: "user_not_found", attempts: 0 }
  if (balance < amt) return { ok: false, error: "insufficient", attempts: balance }

  const insert = await store.insertOp({
    id: crypto.randomUUID(),
    userId,
    jobId,
    kind: "reserve",
    amount: amt,
  })
  if (insert === "duplicate") {
    const again = await store.findOp(jobId, "reserve")
    return {
      ok: true,
      attempts: Math.max(0, (await store.getBalanceForUpdate(userId)) ?? balance),
      amount: again?.amount ?? amt,
      already: true,
    }
  }

  const next = balance - amt
  await store.setBalance(userId, next)
  return { ok: true, attempts: next, amount: amt }
}

export async function runCommitAttempt(
  store: AttemptLedgerStore,
  userId: string,
  jobId: string
): Promise<CommitOrRefundResult> {
  const existingCommit = await store.findOp(jobId, "commit")
  if (existingCommit) {
    const balance = await store.getBalanceForUpdate(userId)
    return {
      ok: true,
      attempts: Math.max(0, balance ?? 0),
      amount: existingCommit.amount,
      already: true,
    }
  }

  const reserve = await store.findOp(jobId, "reserve")
  if (!reserve) {
    const balance = await store.getBalanceForUpdate(userId)
    return { ok: false, error: "no_reserve", attempts: Math.max(0, balance ?? 0) }
  }

  const refund = await store.findOp(jobId, "refund")
  if (refund) {
    const balance = await store.getBalanceForUpdate(userId)
    return { ok: false, error: "no_reserve", attempts: Math.max(0, balance ?? 0) }
  }

  const insert = await store.insertOp({
    id: crypto.randomUUID(),
    userId,
    jobId,
    kind: "commit",
    amount: reserve.amount,
  })
  if (insert === "duplicate") {
    const balance = await store.getBalanceForUpdate(userId)
    return {
      ok: true,
      attempts: Math.max(0, balance ?? 0),
      amount: reserve.amount,
      already: true,
    }
  }

  const balance = await store.getBalanceForUpdate(userId)
  return { ok: true, attempts: Math.max(0, balance ?? 0), amount: reserve.amount }
}

export async function runRefundAttempt(
  store: AttemptLedgerStore,
  userId: string,
  jobId: string
): Promise<CommitOrRefundResult> {
  const existingRefund = await store.findOp(jobId, "refund")
  if (existingRefund) {
    const balance = await store.getBalanceForUpdate(userId)
    return {
      ok: true,
      attempts: Math.max(0, balance ?? 0),
      amount: existingRefund.amount,
      already: true,
    }
  }

  const commit = await store.findOp(jobId, "commit")
  if (commit) {
    const balance = await store.getBalanceForUpdate(userId)
    return { ok: false, error: "no_reserve", attempts: Math.max(0, balance ?? 0) }
  }

  const reserve = await store.findOp(jobId, "reserve")
  if (!reserve) {
    const balance = await store.getBalanceForUpdate(userId)
    return { ok: false, error: "no_reserve", attempts: Math.max(0, balance ?? 0) }
  }

  const insert = await store.insertOp({
    id: crypto.randomUUID(),
    userId,
    jobId,
    kind: "refund",
    amount: reserve.amount,
  })
  if (insert === "duplicate") {
    const balance = await store.getBalanceForUpdate(userId)
    return {
      ok: true,
      attempts: Math.max(0, balance ?? 0),
      amount: reserve.amount,
      already: true,
    }
  }

  const balance = await store.getBalanceForUpdate(userId)
  if (balance == null) return { ok: false, error: "user_not_found", attempts: 0 }
  const next = balance + reserve.amount
  await store.setBalance(userId, next)
  return { ok: true, attempts: next, amount: reserve.amount }
}

export async function runAddAttempts(
  store: AttemptLedgerStore,
  userId: string,
  add: number
): Promise<AttemptBalance | null> {
  const amount = Math.max(0, Math.floor(add))
  const balance = await store.getBalanceForUpdate(userId)
  if (balance == null) return null
  if (amount <= 0) return { attempts: balance }
  const next = balance + amount
  await store.setBalance(userId, next)
  return { attempts: next }
}

/** In-memory store for unit tests (serial ops; call with mutex in parallel tests). */
export function createMemoryAttemptStore(initial: Record<string, number> = {}): AttemptLedgerStore {
  const balances = new Map<string, number>(Object.entries(initial))
  const ops = new Map<string, { id: string; amount: number; kind: AttemptOpKind; userId: string }>()

  const opKey = (jobId: string, kind: AttemptOpKind) => `${jobId}:${kind}`

  return {
    async getBalanceForUpdate(userId) {
      if (!balances.has(userId)) return null
      return balances.get(userId) ?? 0
    },
    async setBalance(userId, attempts) {
      balances.set(userId, Math.max(0, attempts))
    },
    async findOp(jobId, kind) {
      const row = ops.get(opKey(jobId, kind))
      return row ? { id: row.id, amount: row.amount } : null
    },
    async insertOp(input) {
      const key = opKey(input.jobId, input.kind)
      if (ops.has(key)) return "duplicate"
      ops.set(key, {
        id: input.id,
        amount: input.amount,
        kind: input.kind,
        userId: input.userId,
      })
      return "inserted"
    },
  }
}

type BalanceRow = { ai_tracks_attempts: number | null }

function pgStore(client: Parameters<Parameters<typeof withTransaction>[0]>[0]): AttemptLedgerStore {
  return {
    async getBalanceForUpdate(userId) {
      const rows = await clientQuery<BalanceRow>(
        client,
        `SELECT ai_tracks_attempts FROM cabinet_users WHERE id = ? FOR UPDATE`,
        [userId]
      )
      const row = rows[0]
      if (!row) return null
      return Math.max(0, Number(row.ai_tracks_attempts ?? 0) || 0)
    },
    async setBalance(userId, attempts) {
      await clientExecute(client, `UPDATE cabinet_users SET ai_tracks_attempts = ? WHERE id = ?`, [
        Math.max(0, attempts),
        userId,
      ])
    },
    async findOp(jobId, kind) {
      const rows = await clientQuery<{ id: string; amount: number }>(
        client,
        `SELECT id, amount FROM ai_tracks_attempt_ops WHERE job_id = ? AND kind = ?`,
        [jobId, kind]
      )
      const row = rows[0]
      return row ? { id: row.id, amount: Number(row.amount) } : null
    },
    async insertOp(input) {
      try {
        await clientExecute(
          client,
          `INSERT INTO ai_tracks_attempt_ops (id, user_id, job_id, kind, amount) VALUES (?, ?, ?, ?, ?)`,
          [input.id, input.userId, input.jobId, input.kind, input.amount]
        )
        return "inserted"
      } catch (e: unknown) {
        const code =
          e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : ""
        if (code === "23505") return "duplicate"
        throw e
      }
    },
  }
}

export async function getAiTracksAttempts(userId: string): Promise<number> {
  const row = await queryOne<BalanceRow>(
    `SELECT ai_tracks_attempts FROM cabinet_users WHERE id = ?`,
    [userId]
  )
  if (!row) return 0
  return Math.max(0, Number(row.ai_tracks_attempts ?? 0) || 0)
}

export async function reserveAiTracksAttempt(params: {
  userId: string
  jobId: string
  amount: number
}): Promise<ReserveResult> {
  return withTransaction(async (client) => runReserveAttempt(pgStore(client), params.userId, params.jobId, params.amount))
}

export async function commitAiTracksAttempt(params: {
  userId: string
  jobId: string
}): Promise<CommitOrRefundResult> {
  return withTransaction(async (client) => runCommitAttempt(pgStore(client), params.userId, params.jobId))
}

export async function refundAiTracksAttempt(params: {
  userId: string
  jobId: string
}): Promise<CommitOrRefundResult> {
  return withTransaction(async (client) => runRefundAttempt(pgStore(client), params.userId, params.jobId))
}

export async function addAiTracksAttempts(
  userId: string,
  add: number
): Promise<AttemptBalance | null> {
  return withTransaction(async (client) => runAddAttempts(pgStore(client), userId, add))
}
