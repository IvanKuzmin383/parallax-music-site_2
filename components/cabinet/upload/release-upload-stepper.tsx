"use client"

import { Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export const WIZARD_STEPS = [
  { id: 1, label: "Основное" },
  { id: 2, label: "Файлы" },
  { id: 3, label: "Дополнительно" },
  { id: 4, label: "Услуги" },
  { id: 5, label: "Проверка" },
] as const

export function ReleaseUploadStepper({
  currentStep,
  maxReachedStep,
}: {
  currentStep: number
  maxReachedStep: number
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm mb-6">
      {WIZARD_STEPS.map((step, index) => {
        const done = step.id < currentStep
        const active = step.id === currentStep
        const reachable = step.id <= maxReachedStep
        return (
          <div key={step.id} className="flex items-center gap-1 sm:gap-2">
            {index > 0 ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : null}
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-colors",
                active && "bg-primary text-primary-foreground",
                done && !active && "text-green-500",
                !active && !done && reachable && "text-foreground",
                !active && !done && !reachable && "text-muted-foreground"
              )}
            >
              {done ? (
                <Check className="h-3.5 w-3.5 shrink-0" />
              ) : (
                <span className="text-xs font-medium w-4 text-center">{step.id}</span>
              )}
              <span className="whitespace-nowrap">{step.label}</span>
            </div>
          </div>
        )
      })}
    </nav>
  )
}
