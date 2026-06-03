import { getDb } from "./db"

export const TBANK_RECEIPT_TEST_AMOUNT_KOPECKS = 10_000

export type TbankReceiptTestState = {
  orderId: string | null
  paymentId: string | null
  receiptEmail: string | null
  paymentStatus: string | null
  refundStatus: string | null
  lastRefundError: string | null
  updatedAt: string
}

type Row = {
  order_id: string | null
  payment_id: string | null
  receipt_email: string | null
  payment_status: string | null
  refund_status: string | null
  last_refund_error: string | null
  updated_at: string
}

function rowToState(row: Row): TbankReceiptTestState {
  return {
    orderId: row.order_id,
    paymentId: row.payment_id,
    receiptEmail: row.receipt_email,
    paymentStatus: row.payment_status,
    refundStatus: row.refund_status,
    lastRefundError: row.last_refund_error,
    updatedAt: row.updated_at,
  }
}

function nowIso(): string {
  return new Date().toISOString()
}

export function getTbankReceiptTestState(): TbankReceiptTestState | null {
  const db = getDb()
  const row = db.prepare(`SELECT * FROM tbank_receipt_test_state WHERE id = 1`).get() as Row | undefined
  return row ? rowToState(row) : null
}

export function resetTbankReceiptTestPayment(params: {
  orderId: string
  paymentId: string
  receiptEmail: string
}): TbankReceiptTestState {
  const db = getDb()
  const t = nowIso()
  db.prepare(
    `INSERT INTO tbank_receipt_test_state (
      id, order_id, payment_id, receipt_email, payment_status, refund_status, last_refund_error, updated_at
    ) VALUES (1, ?, ?, ?, 'initiated', NULL, NULL, ?)
    ON CONFLICT(id) DO UPDATE SET
      order_id = excluded.order_id,
      payment_id = excluded.payment_id,
      receipt_email = excluded.receipt_email,
      payment_status = 'initiated',
      refund_status = NULL,
      last_refund_error = NULL,
      updated_at = excluded.updated_at`
  ).run(params.orderId, params.paymentId, params.receiptEmail, t)
  return getTbankReceiptTestState()!
}

export function findTbankReceiptTestByOrderId(orderId: string): TbankReceiptTestState | null {
  const state = getTbankReceiptTestState()
  if (!state?.orderId || state.orderId !== orderId) return null
  return state
}

export function updateTbankReceiptTestPaymentStatus(status: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE tbank_receipt_test_state SET payment_status = ?, updated_at = ? WHERE id = 1`
  ).run(status, nowIso())
}

export function updateTbankReceiptTestRefundStatus(status: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE tbank_receipt_test_state SET refund_status = ?, updated_at = ? WHERE id = 1`
  ).run(status, nowIso())
}

export function setTbankReceiptTestRefundError(message: string): void {
  const db = getDb()
  db.prepare(
    `UPDATE tbank_receipt_test_state SET last_refund_error = ?, updated_at = ? WHERE id = 1`
  ).run(message.slice(0, 500), nowIso())
}
