"use client"

import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MODERATION_NOTE_TEMPLATES } from "@/lib/moderation-note-templates"

type AdminModerationNoteTemplatesProps = {
  onApply: (text: string) => void
  disabled?: boolean
}

/** Выбор готового текста для поля комментария модерации. */
export function AdminModerationNoteTemplates({
  onApply,
  disabled,
}: AdminModerationNoteTemplatesProps) {
  const [selectKey, setSelectKey] = useState(0)

  return (
    <Select
      key={selectKey}
      disabled={disabled}
      onValueChange={(id) => {
        const template = MODERATION_NOTE_TEMPLATES.find((t) => t.id === id)
        if (!template) return
        onApply(template.text)
        setSelectKey((k) => k + 1)
      }}
    >
      <SelectTrigger className="w-full sm:w-[280px]">
        <SelectValue placeholder="Вставить шаблон…" />
      </SelectTrigger>
      <SelectContent>
        {MODERATION_NOTE_TEMPLATES.map((t) => (
          <SelectItem key={t.id} value={t.id} title={t.text}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
