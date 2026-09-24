import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { OrderDisplayStatus } from "@/lib/cabinet/types"
import { getOrderDisplayStatusLabel } from "@/lib/cabinet/order-status-map"
import type { TicketStatus } from "@/lib/cabinet/types"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  PauseCircle,
  ShieldAlert,
  UploadCloud,
} from "lucide-react"

type StatusTone =
  | "slate"
  | "amber"
  | "orange"
  | "sky"
  | "blue"
  | "violet"
  | "teal"
  | "emerald"
  | "red"
  | "zinc"

const TONE_CLASS: Record<StatusTone, string> = {
  slate: "border-transparent bg-slate-500/25 text-slate-100",
  amber: "border-transparent bg-amber-500/30 text-amber-100",
  orange: "border-transparent bg-orange-500/30 text-orange-100",
  sky: "border-transparent bg-sky-500/30 text-sky-100",
  blue: "border-transparent bg-blue-500/30 text-blue-100",
  violet: "border-transparent bg-violet-500/30 text-violet-100",
  teal: "border-transparent bg-teal-500/30 text-teal-100",
  emerald: "border-transparent bg-emerald-500/30 text-emerald-100",
  red: "border-transparent bg-red-500/30 text-red-100",
  zinc: "border-transparent bg-zinc-500/30 text-zinc-200",
}

const ORDER_TONE: Record<OrderDisplayStatus, StatusTone> = {
  draft: "slate",
  awaiting_payment: "amber",
  paid: "sky",
  in_progress: "blue",
  review: "violet",
  completed: "emerald",
  cancelled: "zinc",
  rejected: "red",
}

const TICKET_TONE: Record<TicketStatus, StatusTone> = {
  open: "blue",
  pending: "amber",
  answered: "emerald",
  closed: "zinc",
}

const TICKET_LABELS: Record<TicketStatus, string> = {
  open: "Открыт",
  pending: "Ожидает ответа",
  answered: "Есть ответ",
  closed: "Закрыт",
}

/** Определяет цвет по сырому ключу или русской подписи статуса. */
export function resolveStatusTone(status: string): StatusTone {
  const raw = status.trim().toLowerCase()

  if (
    raw === "released" ||
    raw === "completed" ||
    raw === "answered" ||
    raw === "active" ||
    status === "Выпущен"
  ) {
    return "emerald"
  }
  if (raw === "paid") {
    return "sky"
  }
  if (
    raw === "approved_by_platforms" ||
    status.includes("Одобрен площадками")
  ) {
    return "teal"
  }
  if (
    raw === "sent_to_platforms" ||
    status.includes("Отправлен на площадки") ||
    status.includes("На площадках")
  ) {
    return "violet"
  }
  if (raw === "on_moderation" || status.includes("модерац") || raw === "in_progress" || raw === "review") {
    return "blue"
  }
  if (
    raw === "upload_pending" ||
    status.includes("доработ") ||
    status.includes("Ожидает загрузки")
  ) {
    return "orange"
  }
  if (
    raw === "awaiting_payment" ||
    status.includes("оплат") ||
    raw === "pending"
  ) {
    return "amber"
  }
  if (raw === "open") {
    return "blue"
  }
  if (raw === "draft" || status === "Черновик") {
    return "slate"
  }
  if (
    raw === "rejected" ||
    status === "Отклонён" ||
    status.includes("Отклон")
  ) {
    return "red"
  }
  if (
    raw === "postponed" ||
    status === "Отложен" ||
    raw === "cancelled" ||
    raw === "closed"
  ) {
    return "zinc"
  }

  return "slate"
}

interface StatusBadgeProps {
  status: OrderDisplayStatus | TicketStatus | string
  kind?: "order" | "ticket" | "generic"
  className?: string
  withIcon?: boolean
}

function ToneIcon({ tone }: { tone: StatusTone }) {
  const className = "h-3.5 w-3.5 shrink-0"
  if (tone === "emerald") return <CheckCircle2 className={className} />
  if (tone === "amber" || tone === "sky") return <Clock3 className={className} />
  if (tone === "orange" || tone === "red") return <AlertCircle className={className} />
  if (tone === "violet" || tone === "teal") return <UploadCloud className={className} />
  if (tone === "blue") return <ShieldAlert className={className} />
  if (tone === "zinc") return <PauseCircle className={className} />
  return <Clock3 className={className} />
}

export function StatusBadge({ status, kind = "order", className, withIcon = false }: StatusBadgeProps) {
  if (kind === "ticket") {
    const key = status as TicketStatus
    const label = TICKET_LABELS[key] ?? status
    const tone = TICKET_TONE[key] ?? resolveStatusTone(String(status))
    return (
      <Badge variant="outline" className={cn("font-medium gap-1", TONE_CLASS[tone], className)}>
        {withIcon ? <ToneIcon tone={tone} /> : null}
        {label}
      </Badge>
    )
  }

  if (kind === "order") {
    const s = status as OrderDisplayStatus
    const label = getOrderDisplayStatusLabel(s)
    const tone = ORDER_TONE[s] ?? resolveStatusTone(String(status))
    return (
      <Badge variant="outline" className={cn("font-medium gap-1", TONE_CLASS[tone], className)}>
        {withIcon ? <ToneIcon tone={tone} /> : null}
        {label}
      </Badge>
    )
  }

  const tone = resolveStatusTone(String(status))
  return (
    <Badge variant="outline" className={cn("font-medium gap-1", TONE_CLASS[tone], className)}>
      {withIcon ? <ToneIcon tone={tone} /> : null}
      {status}
    </Badge>
  )
}
