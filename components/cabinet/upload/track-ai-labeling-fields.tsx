"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import {
  AI_LABELING_COMPOSITION_FIELDS,
  AI_LABELING_DETAIL_BINARY_LABELS,
  AI_LABELING_DETAIL_TERNARY_LABELS,
  AI_LABELING_MODE_OPTIONS,
  AI_LABELING_RECORDING_FIELDS,
  emptyAiLabelingDetails,
  type AiBinaryChoice,
  type AiLabelingMode,
  type AiTernaryChoice,
  type TrackAiLabeling,
  type TrackAiLabelingDetails,
} from "@/lib/track-ai-labeling"

type TrackAiLabelingFieldsProps = {
  value: TrackAiLabeling | null | undefined
  onChange: (next: TrackAiLabeling) => void
  disabled?: boolean
  trackTitle?: string
}

function ChoicePill({
  selected,
  label,
  disabled,
  onClick,
}: {
  selected: boolean
  label: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
        selected
          ? "bg-primary/15 text-foreground"
          : "bg-muted/40 text-muted-foreground hover:bg-muted/60",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full border",
          selected ? "border-primary" : "border-muted-foreground/40",
        )}
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
      </span>
      {label}
    </button>
  )
}

function DetailChoiceRow({
  value,
  options,
  disabled,
  onChange,
}: {
  value: string
  options: Record<string, string>
  disabled?: boolean
  onChange: (next: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {Object.entries(options).map(([choice, label]) => (
        <ChoicePill
          key={choice}
          selected={value === choice}
          label={label}
          disabled={disabled}
          onClick={() => onChange(choice)}
        />
      ))}
    </div>
  )
}

function DetailFieldRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <p className="text-sm text-muted-foreground sm:min-w-[14rem] sm:shrink-0">{label}</p>
      <div className="min-w-0 sm:flex-1 sm:flex sm:justify-end">{children}</div>
    </div>
  )
}

export function TrackAiLabelingFields({
  value,
  onChange,
  disabled,
  trackTitle,
}: TrackAiLabelingFieldsProps) {
  const mode = value?.mode
  const details = value?.details ?? emptyAiLabelingDetails()

  const setMode = (nextMode: AiLabelingMode) => {
    if (nextMode === "partial") {
      onChange({ mode: nextMode, details: emptyAiLabelingDetails() })
      return
    }
    onChange({ mode: nextMode, details: null })
  }

  const setDetail = <K extends keyof TrackAiLabelingDetails>(
    key: K,
    next: TrackAiLabelingDetails[K],
  ) => {
    onChange({
      mode: "partial",
      details: { ...details, [key]: next },
    })
  }

  return (
    <div className="space-y-5">
      {trackTitle ? <p className="text-sm font-medium">{trackTitle}</p> : null}

      <div className="grid gap-2" role="radiogroup" aria-label="AI-маркировка">
        {AI_LABELING_MODE_OPTIONS.map((opt) => {
          const selected = mode === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => setMode(opt.value)}
              className={cn(
                "flex w-full items-start gap-3 rounded-md border border-border p-3 text-left transition-colors",
                selected && "border-primary bg-primary/5",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                  selected ? "border-primary" : "border-muted-foreground/50",
                )}
              >
                {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
              </span>
              <span className="min-w-0 space-y-0.5">
                <span className="block text-sm font-medium">{opt.label}</span>
                <span className="block text-xs text-muted-foreground">{opt.description}</span>
              </span>
            </button>
          )
        })}
      </div>

      {mode === "partial" ? (
        <div className="space-y-6 rounded-xl bg-muted/20 px-4 py-4 sm:px-5">
          <div>
            <h4 className="font-medium">Детально об ИИ в треке</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Укажите, кто участвовал в каждом этапе создания композиции и итоговой фонограммы.
            </p>
          </div>

          <section className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Композиция (авторство)
            </h5>
            <div className="space-y-3">
              {AI_LABELING_COMPOSITION_FIELDS.map((field) => (
                <DetailFieldRow key={field.key} label={field.label}>
                  <DetailChoiceRow
                    value={details[field.key] as string}
                    options={AI_LABELING_DETAIL_BINARY_LABELS}
                    disabled={disabled}
                    onChange={(v) => setDetail(field.key, v as AiBinaryChoice)}
                  />
                </DetailFieldRow>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Звукозапись трека
            </h5>
            <div className="space-y-3">
              {AI_LABELING_RECORDING_FIELDS.map((field) => (
                <DetailFieldRow key={field.key} label={field.label}>
                  <DetailChoiceRow
                    value={details[field.key] as string}
                    options={AI_LABELING_DETAIL_TERNARY_LABELS}
                    disabled={disabled}
                    onChange={(v) => setDetail(field.key, v as AiTernaryChoice)}
                  />
                </DetailFieldRow>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}
