"use client"

import { CircleHelp, Globe, Landmark, Monitor } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  STREAMING_SCOPE_OPTIONS,
  normalizeStreamingScope,
  type TrackStreamingScope,
} from "@/lib/track-constants"

const ICONS = {
  all: Monitor,
  ru: Landmark,
  foreign: Globe,
} as const

type StreamingServicesFieldProps = {
  value?: TrackStreamingScope | string | null
  onChange: (value: TrackStreamingScope) => void
  disabled?: boolean
  idPrefix?: string
  className?: string
}

export function StreamingServicesField({
  value,
  onChange,
  disabled = false,
  idPrefix = "streaming",
  className,
}: StreamingServicesFieldProps) {
  const resolvedValue = normalizeStreamingScope(value)

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-semibold">Стриминг-сервисы</Label>
      <RadioGroup
        value={resolvedValue}
        onValueChange={(next) => onChange(normalizeStreamingScope(next))}
        className="grid grid-cols-1 gap-2 rounded-lg border border-border p-2 sm:grid-cols-3"
        disabled={disabled}
      >
        {STREAMING_SCOPE_OPTIONS.map((option) => {
          const Icon = ICONS[option.value]
          const selected = resolvedValue === option.value
          const inputId = `${idPrefix}-${option.value}`

          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={cn(
                "relative flex cursor-pointer gap-3 rounded-md border p-3 transition-colors",
                selected ? "border-border bg-background" : "border-transparent bg-muted/60",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    onClick={(event) => event.preventDefault()}
                    aria-label={`Подсказка: ${option.shortLabel}`}
                  >
                    <CircleHelp className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {option.hint}
                </TooltipContent>
              </Tooltip>
              <RadioGroupItem value={option.value} id={inputId} className="mt-1 shrink-0" />
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 pr-6 text-center sm:items-start sm:text-left">
                <Icon className="h-8 w-8 text-muted-foreground" strokeWidth={1.25} />
                <span className="text-xs font-medium uppercase leading-tight tracking-wide">
                  {option.label}
                </span>
              </div>
            </label>
          )
        })}
      </RadioGroup>
    </div>
  )
}

export function streamingScopeShortLabel(scope: TrackStreamingScope): string {
  return STREAMING_SCOPE_OPTIONS.find((option) => option.value === scope)?.shortLabel ?? "Все"
}
