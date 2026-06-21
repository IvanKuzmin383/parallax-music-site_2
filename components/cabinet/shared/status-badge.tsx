import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { OrderDisplayStatus } from "@/lib/cabinet/types"
import { getOrderDisplayStatusLabel } from "@/lib/cabinet/order-status-map"
import type { TicketStatus } from "@/lib/cabinet/types"

const ORDER_VARIANT: Record<OrderDisplayStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  awaiting_payment: "outline",
  paid: "secondary",
  in_progress: "default",
  review: "outline",
  completed: "default",
  cancelled: "destructive",
  rejected: "destructive",
}

const TICKET_LABELS: Record<TicketStatus, string> = {
  open: "Открыт",
  pending: "Ожидает ответа",
  answered: "Есть ответ",
  closed: "Закрыт",
}

interface StatusBadgeProps {
  status: OrderDisplayStatus | TicketStatus | string
  kind?: "order" | "ticket" | "generic"
  className?: string
}

export function StatusBadge({ status, kind = "order", className }: StatusBadgeProps) {
  if (kind === "ticket") {
    const label = TICKET_LABELS[status as TicketStatus] ?? status
    return (
      <Badge variant="outline" className={cn("font-normal", className)}>
        {label}
      </Badge>
    )
  }

  if (kind === "order") {
    const s = status as OrderDisplayStatus
    const label = getOrderDisplayStatusLabel(s)
    const variant = ORDER_VARIANT[s] ?? "secondary"
    return (
      <Badge variant={variant} className={cn("font-normal", className)}>
        {label}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className={cn("font-normal", className)}>
      {status}
    </Badge>
  )
}
