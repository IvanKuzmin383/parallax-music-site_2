"use client"

import { AlertCircle, Check, ChevronRight } from "lucide-react"
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
  issueSteps,
  onStepClick,
}: {
  currentStep: number
  maxReachedStep: number
  /** Шаги, где в проверке есть незаполненные / ошибочные поля */
  issueSteps?: ReadonlySet<number> | readonly number[]
  onStepClick?: (step: number) => void
}) {
  const issues =
    issueSteps instanceof Set
      ? issueSteps
      : new Set(issueSteps ?? [])

  return (
    <nav className="flex flex-wrap items-center gap-1 sm:gap-2 text-sm mb-6" aria-label="Этапы загрузки релиза">
      {WIZARD_STEPS.map((step, index) => {
        const done = step.id < currentStep
        const active = step.id === currentStep
        const hasIssue = issues.has(step.id)
        const reachable = step.id <= maxReachedStep
        const canNavigate = Boolean(onStepClick) && reachable && !active

        const content = (
          <>
            {hasIssue && !active ? (
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            ) : done ? (
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
          !active && hasIssue && "text-amber-500",
          !active && done && !hasIssue && "text-green-500",
          !active && !done && !hasIssue && reachable && "text-foreground",
          !active && !done && !hasIssue && !reachable && "text-muted-foreground",
          canNavigate && "cursor-pointer hover:bg-muted/60",
          canNavigate && done && !hasIssue && "hover:text-green-400",
          canNavigate && hasIssue && "hover:text-amber-400",
        )

        const ariaExtra = hasIssue ? ", требуется исправление" : ""

        return (
          <div key={step.id} className="flex items-center gap-1 sm:gap-2">
            {index > 0 ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : null}
            {canNavigate ? (
              <button
                type="button"
                className={className}
                onClick={() => onStepClick?.(step.id)}
                aria-label={`${step.id < currentStep ? "Перейти" : "Перейти вперёд"} к этапу «${step.label}»${ariaExtra}`}
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
