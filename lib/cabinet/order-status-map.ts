import type { FulfillmentStatus } from "@/lib/service-fulfillments"
import type { OrderStatus } from "@/lib/orders"
import type { OrderDisplayStatus } from "./types"

const DISPLAY_LABELS: Record<OrderDisplayStatus, string> = {
  draft: "Черновик",
  awaiting_payment: "Ожидает оплаты",
  paid: "Оплачен",
  in_progress: "В работе",
  review: "На проверке",
  completed: "Выполнен",
  cancelled: "Отменён",
  rejected: "Отклонён",
}

export function getOrderDisplayStatusLabel(status: OrderDisplayStatus): string {
  return DISPLAY_LABELS[status]
}

export function resolveOrderDisplayStatus(
  paymentStatus: OrderStatus | string,
  fulfillmentStatus?: FulfillmentStatus | null
): OrderDisplayStatus {
  if (paymentStatus === "pending") return "awaiting_payment"
  if (paymentStatus === "failed") return "cancelled"
  if (paymentStatus === "paid") {
    if (!fulfillmentStatus || fulfillmentStatus === "new") return "paid"
    if (fulfillmentStatus === "in_progress") return "in_progress"
    if (fulfillmentStatus === "done") return "completed"
  }
  return "draft"
}

export type OrderFilterKey =
  | "all"
  | "new"
  | "in_progress"
  | "awaiting_payment"
  | "completed"
  | "cancelled"

export function matchesOrderFilter(status: OrderDisplayStatus, filter: OrderFilterKey): boolean {
  if (filter === "all") return true
  if (filter === "new") return status === "paid" || status === "draft"
  if (filter === "in_progress") return status === "in_progress" || status === "review"
  if (filter === "awaiting_payment") return status === "awaiting_payment"
  if (filter === "completed") return status === "completed"
  if (filter === "cancelled") return status === "cancelled" || status === "rejected"
  return true
}

export const ORDER_TIMELINE_STEPS = [
  { key: "created", label: "Заказ создан" },
  { key: "awaiting_payment", label: "Ожидает оплаты" },
  { key: "payment_received", label: "Оплата получена" },
  { key: "accepted", label: "Принят в работу" },
  { key: "in_progress", label: "Выполняется" },
  { key: "done", label: "Готово" },
] as const
