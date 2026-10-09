"use client"

import { Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function hasAiAnalysisText(text: string | null | undefined): boolean {
  return Boolean(text?.trim())
}

/** Бейдж на карточке / в шапке релиза. */
export function AiAnalysisBadge({
  onClick,
  className,
}: {
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex", className)}
      aria-label="Открыть AI-анализ"
    >
      <Badge
        className={cn(
          "border-transparent bg-violet-500/30 text-violet-100 hover:bg-violet-500/40",
          "cursor-pointer gap-1 text-[11px] font-medium",
        )}
      >
        <Sparkles className="h-3 w-3" />
        AI-анализ
      </Badge>
    </button>
  )
}

/** Диалог с текстом анализа. */
export function AiAnalysisDialog({
  open,
  onOpenChange,
  title,
  text,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  text: string
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-400" />
            AI-анализ
          </DialogTitle>
          {title ? (
            <DialogDescription className="text-left">
              Рекомендации по релизу «{title}»
            </DialogDescription>
          ) : (
            <DialogDescription className="text-left">
              Рекомендации по релизу
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {text.trim()}
        </div>
        <div className="flex justify-end pt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Карточка/панель на странице релиза. */
export function AiAnalysisPanel({
  text,
  className,
  onRead,
}: {
  text: string
  className?: string
  onRead?: () => void
}) {
  if (!text.trim()) return null

  return (
    <aside
      className={cn(
        "rounded-xl border border-violet-500/30 bg-violet-500/10 p-4 space-y-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-violet-300" />
          <h2 className="text-sm font-semibold text-violet-100">AI-анализ</h2>
        </div>
        {onRead ? (
          <Button type="button" size="sm" variant="outline" onClick={onRead}>
            Читать
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
        {text.trim()}
      </p>
    </aside>
  )
}
