"use client"

import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { CabinetKycStatusView } from "@/lib/cabinet/types"
import { useCabinetKyc } from "@/components/cabinet/kyc/cabinet-kyc-provider"

const LABELS: Record<CabinetKycStatusView, string> = {
  unverified: "Требуется верификация",
  pending: "На верификации",
  verified: "Верифицирован",
  rejected: "Верификация отклонена",
}

export function CabinetKycStatusBadge({ className }: { className?: string }) {
  const { status, openForm, openRequired } = useCabinetKyc()

  const dotClass =
    status === "verified"
      ? "bg-emerald-400"
      : status === "pending"
        ? "bg-amber-400"
        : status === "rejected"
          ? "bg-rose-400"
          : "bg-amber-400"

  const clickable = status === "unverified" || status === "rejected"

  const content = (
    <>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} />
      <span className="min-w-0 flex-1 truncate font-medium">{LABELS[status]}</span>
      {clickable ? <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" /> : null}
    </>
  )

  const shellClass = cn(
    "flex w-full items-center gap-2 rounded-full px-2.5 py-1.5 text-left text-xs",
    "bg-muted/70 text-foreground ring-1 ring-inset ring-border/70",
    className
  )

  if (!clickable) {
    return <div className={shellClass}>{content}</div>
  }

  return (
    <button
      type="button"
      onClick={() => {
        if (status === "unverified") openRequired()
        else openForm()
      }}
      className={cn(shellClass, "hover:bg-muted transition-colors")}
    >
      {content}
    </button>
  )
}
