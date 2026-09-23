"use client"

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
}: {
  selected: boolean
  label: string
  disabled?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
        selected
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground",
        disabled && "opacity-50"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full border",
          selected ? "border-primary" : "border-muted-foreground/50"
        )}
      >
        {selected ? <span className="h-2 w-2 rounded-full bg-primary" /> : null}
      </span>
      {label}
    </span>
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
      onChange({ mode: nextMode, details: value?.details ?? emptyAiLabelingDetails() })
      return
    }
    onChange({ mode: nextMode, details: null })
  }

  const setDetail = <K extends keyof TrackAiLabelingDetails>(
    key: K,
    next: TrackAiLabelingDetails[K]
  ) => {
    onChange({
      mode: "partial",
      details: { ...details, [key]: next },
    })
  }

  return (
    <div className="space-y-5">
      {trackTitle ? <p className="text-sm font-medium">{trackTitle}</p> : null}

      <RadioGroup
        value={mode ?? ""}
        onValueChange={(v) => setMode(v as AiLabelingMode)}
        disabled={disabled}
        className="gap-2"
      >
        {AI_LABELING_MODE_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 transition-colors",
              mode === opt.value && "border-primary bg-primary/5",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            <RadioGroupItem value={opt.value} className="mt-0.5" disabled={disabled} />
            <span className="min-w-0 space-y-0.5">
              <span className="block text-sm font-medium">{opt.label}</span>
              <span className="block text-xs text-muted-foreground">{opt.description}</span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {mode === "partial" ? (
        <div className="space-y-4 rounded-md border border-border p-4">
          <div>
            <h4 className="font-medium">Подробно об ИИ в треке</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Укажите, кто участвовал в каждом этапе создания композиции и итоговой фонограммы.
            </p>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[36rem] text-sm">
              <tbody>
                <tr className="border-b border-border">
                  <td
                    rowSpan={AI_LABELING_COMPOSITION_FIELDS.length}
                    className="w-40 align-middle border-r border-border bg-muted/20 px-3 py-3 font-medium"
                  >
                    Композиция (авторство)
                  </td>
                  <td className="border-r border-border px-3 py-2.5">
                    {AI_LABELING_COMPOSITION_FIELDS[0].label}
                  </td>
                  <td className="px-3 py-2.5">
                    <RadioGroup
                      value={details.musicAuthorship}
                      onValueChange={(v) => setDetail("musicAuthorship", v as AiBinaryChoice)}
                      disabled={disabled}
                      className="flex flex-wrap gap-2"
                    >
                      {(Object.keys(AI_LABELING_DETAIL_BINARY_LABELS) as AiBinaryChoice[]).map(
                        (choice) => (
                          <label key={choice} className="cursor-pointer">
                            <RadioGroupItem value={choice} className="sr-only" disabled={disabled} />
                            <ChoicePill
                              selected={details.musicAuthorship === choice}
                              label={AI_LABELING_DETAIL_BINARY_LABELS[choice]}
                              disabled={disabled}
                            />
                          </label>
                        )
                      )}
                    </RadioGroup>
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="border-r border-border px-3 py-2.5">
                    {AI_LABELING_COMPOSITION_FIELDS[1].label}
                  </td>
                  <td className="px-3 py-2.5">
                    <RadioGroup
                      value={details.lyricsAuthorship}
                      onValueChange={(v) => setDetail("lyricsAuthorship", v as AiBinaryChoice)}
                      disabled={disabled}
                      className="flex flex-wrap gap-2"
                    >
                      {(Object.keys(AI_LABELING_DETAIL_BINARY_LABELS) as AiBinaryChoice[]).map(
                        (choice) => (
                          <label key={choice} className="cursor-pointer">
                            <RadioGroupItem value={choice} className="sr-only" disabled={disabled} />
                            <ChoicePill
                              selected={details.lyricsAuthorship === choice}
                              label={AI_LABELING_DETAIL_BINARY_LABELS[choice]}
                              disabled={disabled}
                            />
                          </label>
                        )
                      )}
                    </RadioGroup>
                  </td>
                </tr>

                {AI_LABELING_RECORDING_FIELDS.map((field, index) => (
                  <tr
                    key={field.key}
                    className={cn(index < AI_LABELING_RECORDING_FIELDS.length - 1 && "border-b border-border")}
                  >
                    {index === 0 ? (
                      <td
                        rowSpan={AI_LABELING_RECORDING_FIELDS.length}
                        className="w-40 align-middle border-r border-border bg-muted/20 px-3 py-3 font-medium"
                      >
                        Звукозапись трека
                      </td>
                    ) : null}
                    <td className="border-r border-border px-3 py-2.5">{field.label}</td>
                    <td className="px-3 py-2.5">
                      <RadioGroup
                        value={details[field.key] as string}
                        onValueChange={(v) => setDetail(field.key, v as AiTernaryChoice)}
                        disabled={disabled}
                        className="flex flex-wrap gap-2"
                      >
                        {(Object.keys(AI_LABELING_DETAIL_TERNARY_LABELS) as AiTernaryChoice[]).map(
                          (choice) => (
                            <label key={choice} className="cursor-pointer">
                              <RadioGroupItem value={choice} className="sr-only" disabled={disabled} />
                              <ChoicePill
                                selected={details[field.key] === choice}
                                label={AI_LABELING_DETAIL_TERNARY_LABELS[choice]}
                                disabled={disabled}
                              />
                            </label>
                          )
                        )}
                      </RadioGroup>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function AiLabelingIntroCard() {
  return (
    <div className="space-y-4 rounded-lg border border-primary/40 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
          AI
        </div>
        <div className="min-w-0 space-y-1">
          <h2 className="text-base font-semibold">Обязательная AI-маркировка</h2>
          <p className="text-sm text-muted-foreground">
            Выберите один вариант для каждого трека
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {AI_LABELING_MODE_OPTIONS.map((opt) => (
          <div key={opt.value} className="rounded-md bg-muted/40 p-3 text-sm">
            <span className="font-medium">«{opt.label}»</span>
            <span className="text-muted-foreground"> — {opt.description}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
