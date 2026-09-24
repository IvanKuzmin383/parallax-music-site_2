"use client"

import { Check, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

export const WIZARD_STEPS = [
  { id: 1, label: "Основное" },
  { id: 2, label: "Файлы" },
  { id: 3, label: "Данные" },
  { id: 4, label: "AI-маркировка" },
  { id: 5, label: "Услуги" },
  { id: 6, label: "Проверка" },
] as const

export const WIZARD_STEP_COUNT = WIZARD_STEPS.length

export function ReleaseUploadStepper({
  currentStep,
  maxReachedStep,
  onStepClick,
}: {
  currentStep: number
  maxReachedStep: number
  onStepClick?: (step: number) => void
}) {
  return (
    <nav className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm mb-6" aria-label="Этапы загрузки релиза">
      {WIZARD_STEPS.map((step, index) => {
        const done = step.id < currentStep
        const active = step.id === currentStep
        const reachable = step.id <= maxReachedStep
        const canGoBack = Boolean(onStepClick) && step.id < currentStep

        const content = (
          <>
            {done ? (
              <Check className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <span className="text-xs font-medium w-4 text-center">{step.id}</span>
            )}
            <span className="whitespace-nowrap">{step.label}</span>
          </>
        )

        const className = cn(
          "flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
          active && "bg-primary text-primary-foreground",
          done && !active && "text-green-500",
          !active && !done && reachable && "text-foreground",
          !active && !done && !reachable && "text-muted-foreground",
          canGoBack && "cursor-pointer hover:bg-muted/60 hover:text-green-400",
        )

        return (
          <div key={step.id} className="flex items-center gap-1 sm:gap-2">
            {index > 0 ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : null}
            {canGoBack ? (
              <button
                type="button"
                className={className}
                onClick={() => onStepClick?.(step.id)}
                aria-label={`Вернуться к этапу «${step.label}»`}
              >
                {content}
              </button>
            ) : (
              <div className={className} aria-current={active ? "step" : undefined}>
                {content}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}
