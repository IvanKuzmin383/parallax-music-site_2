import crypto from "crypto"
import { getDb } from "@/lib/db"
import type { SubscriptionBillingRunResult } from "@/lib/subscription-billing"

export type SubscriptionBillingRunLog = {
  id: string
  source: string
  startedAt: string
  finishedAt?: string
  usersConsidered: number
  remindersSent: number
  chargesInitiated: number
  errorsCount: number
  errors: string[]
  triggerIp?: string
  triggerUserAgent?: string
  triggerNote?: string
}

type SubscriptionBillingRunRow = {
  id: string
  source: string
  started_at: string
  finished_at: string | null
  users_considered: number
  reminders_sent: number
  charges_initiated: number
  errors_count: number
  errors_json: string | null
  trigger_ip: string | null
  trigger_user_agent: string | null
  trigger_note: string | null
}

function rowToLog(row: SubscriptionBillingRunRow): SubscriptionBillingRunLog {
  let errors: string[] = []
  if (row.errors_json) {
    try {
      const parsed = JSON.parse(row.errors_json)
      if (Array.isArray(parsed)) {
        errors = parsed.filter((v): v is string => typeof v === "string")
      }
    } catch {
      // ignore malformed JSON in old rows
    }
  }
  return {
    id: row.id,
    source: row.source,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    usersConsidered: row.users_considered,
    remindersSent: row.reminders_sent,
    chargesInitiated: row.charges_initiated,
    errorsCount: row.errors_count,
    errors,
    triggerIp: row.trigger_ip ?? undefined,
    triggerUserAgent: row.trigger_user_agent ?? undefined,
    triggerNote: row.trigger_note ?? undefined,
  }
}

export function createSubscriptionBillingRunLog(params: {
  source: string
  triggerIp?: string | null
  triggerUserAgent?: string | null
  triggerNote?: string | null
}): string {
  const db = getDb()
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO subscription_billing_runs (
      id, source, started_at, users_considered, reminders_sent, charges_initiated, errors_count, errors_json, trigger_ip, trigger_user_agent, trigger_note
    ) VALUES (?, ?, ?, 0, 0, 0, 0, ?, ?, ?, ?)`
  ).run(
    id,
    params.source,
    new Date().toISOString(),
    JSON.stringify([]),
    params.triggerIp ?? null,
    params.triggerUserAgent ?? null,
    params.triggerNote ?? null
  )
  return id
}

export function finalizeSubscriptionBillingRunLog(runId: string, result: SubscriptionBillingRunResult): void {
  const db = getDb()
  const errors = result.errors ?? []
  db.prepare(
    `UPDATE subscription_billing_runs
     SET finished_at = ?,
         users_considered = ?,
         reminders_sent = ?,
         charges_initiated = ?,
         errors_count = ?,
         errors_json = ?
     WHERE id = ?`
  ).run(
    new Date().toISOString(),
    result.usersConsidered,
    result.remindersSent,
    result.chargesInitiated,
    errors.length,
    JSON.stringify(errors),
    runId
  )
}

export function markSubscriptionBillingRunFailed(runId: string, errorMessage: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE subscription_billing_runs
     SET finished_at = ?,
         errors_count = ?,
         errors_json = ?
     WHERE id = ?`
  ).run(new Date().toISOString(), 1, JSON.stringify([errorMessage]), runId)
}

export function listSubscriptionBillingRuns(limit = 20): SubscriptionBillingRunLog[] {
  const db = getDb()
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)))
  const rows = db
    .prepare(
      `SELECT id, source, started_at, finished_at, users_considered, reminders_sent, charges_initiated, errors_count, errors_json, trigger_ip, trigger_user_agent, trigger_note
       FROM subscription_billing_runs
       ORDER BY started_at DESC
       LIMIT ?`
    )
    .all(safeLimit) as SubscriptionBillingRunRow[]
  return rows.map(rowToLog)
}
