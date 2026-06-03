import { getDb } from "./db"

export const TBANK_RECURRENT_TEST_CUSTOMER_KEY = "recurrent-test-customer"
export const TBANK_RECURRENT_TEST_AMOUNT_KOPECKS = 10_000

export type TbankRecurrentTestState = {
  customerKey: string
  parentOrderId: string | null
  parentPaymentId: string | null
  rebillId: string | null
  parentStatus: string | null
  childOrderId: string | null
  childPaymentId: string | null
  childStatus: string | null
  lastChargeError: string | null
  updatedAt: string
}

type Row = {
  customer_key: string
  parent_order_id: string | null
  parent_payment_id: string | null
  rebill_id: string | null
  parent_status: string | null
  child_order_id: string | null
  child_payment_id: string | null
  child_status: string | null
  last_charge_error: string | null
  updated_at: string
}

function rowToState(row: Row): TbankRecurrentTestState {
  return {
    customerKey: row.customer_key,
    parentOrderId: row.parent_order_id,
    parentPaymentId: row.parent_payment_id,
    rebillId: row.rebill_id,
    parentStatus: row.parent_status,
    childOrderId: row.child_order_id,
    childPaymentId: row.child_payment_id,
    childStatus: row.child_status,
    lastChargeError: row.last_charge_error,
    updatedAt: row.updated_at,
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

export function getTbankRecurrentTestState(): TbankRecurrentTestState | null {
  const db = getDb()
  const row = db
    .prepare(`SELECT * FROM tbank_recurrent_test_state WHERE id = 1`)
    .get() as Row | undefined
  return row ? rowToState(row) : null
}

export function resetTbankRecurrentTestParent(params: {
  parentOrderId: string
  parentPaymentId: string
}): TbankRecurrentTestState {
  const db = getDb()
  const t = nowIso()
  db.prepare(
    `INSERT INTO tbank_recurrent_test_state (
      id, customer_key, parent_order_id, parent_payment_id, rebill_id, parent_status,
      child_order_id, child_payment_id, child_status, last_charge_error, updated_at
    ) VALUES (1, ?, ?, ?, NULL, 'initiated', NULL, NULL, NULL, NULL, ?)
    ON CONFLICT(id) DO UPDATE SET
      customer_key = excluded.customer_key,
      parent_order_id = excluded.parent_order_id,
      parent_payment_id = excluded.parent_payment_id,
      rebill_id = NULL,
      parent_status = 'initiated',
      child_order_id = NULL,
      child_payment_id = NULL,
      child_status = NULL,
      last_charge_error = NULL,
      updated_at = excluded.updated_at`
  ).run(TBANK_RECURRENT_TEST_CUSTOMER_KEY, params.parentOrderId, params.parentPaymentId, t)
  return getTbankRecurrentTestState()!
}

export function findTbankRecurrentTestByOrderId(orderId: string): {
  state: TbankRecurrentTestState
  step: "parent" | "child"
} | null {
  const state = getTbankRecurrentTestState()
  if (!state) return null
  if (state.parentOrderId === orderId) return { state, step: "parent" }
  if (state.childOrderId === orderId) return { state, step: "child" }
  return null
}

export function saveTbankRecurrentTestRebillId(rebillId: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE tbank_recurrent_test_state
     SET rebill_id = ?, updated_at = ?
     WHERE id = 1`
  ).run(rebillId, nowIso())
}

export function updateTbankRecurrentTestStatus(orderId: string, status: string): void {
  const match = findTbankRecurrentTestByOrderId(orderId)
  if (!match) return
  const db = getDb()
  const column = match.step === "parent" ? "parent_status" : "child_status"
  db.prepare(
    `UPDATE tbank_recurrent_test_state SET ${column} = ?, updated_at = ? WHERE id = 1`
  ).run(status, nowIso())
}

export function setTbankRecurrentTestChildInit(params: {
  childOrderId: string
  childPaymentId: string
}): void {
  const db = getDb()
  db.prepare(
    `UPDATE tbank_recurrent_test_state
     SET child_order_id = ?, child_payment_id = ?, child_status = 'initiated', last_charge_error = NULL, updated_at = ?
     WHERE id = 1`
  ).run(params.childOrderId, params.childPaymentId, nowIso())
}

export function setTbankRecurrentTestChargeError(message: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE tbank_recurrent_test_state SET last_charge_error = ?, updated_at = ? WHERE id = 1`
  ).run(message.slice(0, 500), nowIso())
}
