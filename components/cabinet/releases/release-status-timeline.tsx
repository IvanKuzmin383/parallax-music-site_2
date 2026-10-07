"use client"

import { Check } from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { cn } from "@/lib/utils"
import type { ReleaseStatus } from "@/lib/releases"

/** Ровно подписи статусов пайплайна релиза (как в кабинете). */
const STEPS = [
  { id: "on_moderation", label: "На модерации" },
  { id: "sent_to_platforms", label: "Отправлен на площадки" },
  { id: "approved_by_platforms", label: "Одобрен площадками" },
  { id: "released", label: "Выпущен" },
] as const

function resolveActiveStepIndex(status: string | null | undefined): number | null {
  switch (status) {
    case "on_moderation":
    case "upload_pending":
    case "rejected":
    case "postponed":
      return 0
    case "sent_to_platforms":
      return 1
    case "approved_by_platforms":
      return 2
    case "released":
      return 3
    default:
      return null
  }
}

function formatStepDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return null
    return format(d, "d MMM", { locale: ru })
  } catch {
    return null
  }
}

type ReleaseStatusTimelineProps = {
  status: ReleaseStatus | string | null | undefined
  createdAt?: string | null
  updatedAt?: string | null
  releaseDate?: string | null
  className?: string
}

export function ReleaseStatusTimeline({
  status,
  createdAt,
  updatedAt,
  releaseDate,
  className,
}: ReleaseStatusTimelineProps) {
  const activeIndex = resolveActiveStepIndex(status)
  if (activeIndex == null) return null

  const allDone = status === "released"
  const currentLabelOverride =
    status === "upload_pending"
      ? "Требуется доработка"
      : status === "rejected"
        ? "Отклонён"
        : status === "postponed"
          ? "Отозван"
          : null

  const dates: (string | null)[] = [
    formatStepDate(createdAt),
    activeIndex >= 1 ? formatStepDate(updatedAt) : null,
    activeIndex >= 2 ? formatStepDate(updatedAt) : null,
    activeIndex >= 3 ? formatStepDate(releaseDate) ?? formatStepDate(updatedAt) : null,
  ]

  return (
    <div className={cn("w-full", className)}>
      <ol className="relative grid grid-cols-2 gap-y-6 sm:grid-cols-4 sm:gap-1">
        {STEPS.map((step, index) => {
          const done = allDone || index < activeIndex
          const current = !allDone && index === activeIndex
          const future = index > activeIndex
          const showDots = current && index < STEPS.length - 1
          const label =
            current && currentLabelOverride ? currentLabelOverride : step.label

          return (
            <li key={step.id} className="relative flex flex-col items-center text-center px-1">
              {index < STEPS.length - 1 ? (
                <div
                  className={cn(
                    "pointer-events-none absolute top-4 left-[calc(50%+0.85rem)] h-0.5",
                    "right-[calc(-50%+0.85rem)] hidden sm:block",
                  )}
                  aria-hidden
                >
                  {done ? (
                    <div className="h-full w-full rounded-full bg-emerald-500" />
                  ) : showDots ? (
                    <div className="relative h-full w-[68%] overflow-hidden">
                      <div className="release-status-dots h-full w-[200%]" />
                    </div>
                  ) : (
                    <div className="h-full w-full rounded-full bg-muted-foreground/25" />
                  )}
                </div>
              ) : null}

              <div
                className={cn(
                  "relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                  done &&
                    "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_16px_-2px_rgba(16,185,129,0.55)]",
                  current &&
                    "release-status-pulse border-emerald-500 bg-emerald-500 text-white",
                  future && "border-muted-foreground/30 bg-muted/40 text-muted-foreground/50",
                )}
              >
                {done || current ? <Check className="h-4 w-4" strokeWidth={2.5} /> : null}
              </div>

              <p
                className={cn(
                  "mt-2 text-[11px] font-semibold leading-snug sm:text-sm",
                  done || current ? "text-foreground" : "text-muted-foreground/50",
                )}
              >
                {label}
              </p>
              {dates[index] ? (
                <p
                  className={cn(
                    "mt-0.5 text-[11px] sm:text-xs",
                    done || current ? "text-muted-foreground" : "text-muted-foreground/40",
                  )}
                >
                  {dates[index]}
                </p>
              ) : (
                <p className="mt-0.5 text-[11px] sm:text-xs text-transparent select-none">—</p>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
