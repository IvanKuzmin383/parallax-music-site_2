import { execute, queryOne } from "./database"

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

export async function getTbankReceiptTestState(): Promise<TbankReceiptTestState | null> {
  const row = await queryOne<Row>(`SELECT * FROM tbank_receipt_test_state WHERE id = 1`)
  return row ? rowToState(row) : null
}

export async function resetTbankReceiptTestPayment(params: {
  orderId: string
  paymentId: string
  receiptEmail: string
}): Promise<TbankReceiptTestState> {
  const t = nowIso()
  await execute(
    `INSERT INTO tbank_receipt_test_state (
      id, order_id, payment_id, receipt_email, payment_status, refund_status, last_refund_error, updated_at
    ) VALUES (1, ?, ?, ?, 'initiated', NULL, NULL, ?)
    ON CONFLICT(id) DO UPDATE SET
      order_id = EXCLUDED.order_id,
      payment_id = EXCLUDED.payment_id,
      receipt_email = EXCLUDED.receipt_email,
      payment_status = 'initiated',
      refund_status = NULL,
      last_refund_error = NULL,
      updated_at = EXCLUDED.updated_at`,
    [params.orderId, params.paymentId, params.receiptEmail, t]
  )
  return (await getTbankReceiptTestState())!
}

export async function findTbankReceiptTestByOrderId(orderId: string): Promise<TbankReceiptTestState | null> {
  const state = await getTbankReceiptTestState()
  if (!state?.orderId || state.orderId !== orderId) return null
  return state
}

export async function updateTbankReceiptTestPaymentStatus(status: string): Promise<void> {
  await execute(`UPDATE tbank_receipt_test_state SET payment_status = ?, updated_at = ? WHERE id = 1`, [
    status,
    nowIso(),
  ])
}

export async function updateTbankReceiptTestRefundStatus(status: string): Promise<void> {
  await execute(`UPDATE tbank_receipt_test_state SET refund_status = ?, updated_at = ? WHERE id = 1`, [
    status,
    nowIso(),
  ])
}

export async function setTbankReceiptTestRefundError(message: string): Promise<void> {
  await execute(`UPDATE tbank_receipt_test_state SET last_refund_error = ?, updated_at = ? WHERE id = 1`, [
    message.slice(0, 500),
    nowIso(),
  ])
}
