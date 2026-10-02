"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SMARTLINK_PLATFORMS, PLATFORM_ICON_SRC, type PlatformLinks, type PlatformLinkKey } from "@/lib/smartlink-platforms"

function CopyField({
  label,
  value,
  emptyText = "—",
}: {
  label: string
  value: string | null | undefined
  emptyText?: string
}) {
  const [copied, setCopied] = useState(false)
  const trimmed = value?.trim() || ""
  const canCopy = trimmed.length > 0

  const onCopy = useCallback(async () => {
    if (!canCopy) return
    try {
      await navigator.clipboard.writeText(trimmed)
      setCopied(true)
      toast.success("Скопировано")
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error("Не удалось скопировать")
    }
  }, [canCopy, trimmed])

  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5 min-w-0">
        <p className={cn("min-w-0 truncate text-sm", canCopy ? "font-medium" : "text-muted-foreground")}>
          {canCopy ? trimmed : emptyText}
        </p>
        {canCopy ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => void onCopy()}
            aria-label={`Скопировать ${label}`}
            title="Скопировать"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** Фирменные знаки. Со ссылкой — цветные; без — grayscale. */
function PlatformGlyph({
  platformKey,
  active,
}: {
  platformKey: PlatformLinkKey
  active: boolean
}) {
  return (
    <img
      src={PLATFORM_ICON_SRC[platformKey]}
      alt=""
      className={cn(
        "h-8 w-8 shrink-0 rounded-[22%] object-contain",
        !active && "grayscale opacity-45",
      )}
      draggable={false}
    />
  )
}

type ReleasePlatformMetaProps = {
  upc?: string | null
  isrc?: string | null
  genre?: string | null
  territory?: string | null
  smartlinkSlug?: string | null
  platformLinks?: PlatformLinks | null
  className?: string
}

export function ReleasePlatformMeta({
  upc,
  isrc,
  genre,
  territory,
  smartlinkSlug,
  platformLinks,
  className,
}: ReleasePlatformMetaProps) {
  const [smartlinkUrl, setSmartlinkUrl] = useState<string | null>(null)

  useEffect(() => {
    const slug = smartlinkSlug?.trim()
    if (!slug) {
      setSmartlinkUrl(null)
      return
    }
    setSmartlinkUrl(`${window.location.origin}/s/${slug}`)
  }, [smartlinkSlug])

  return (
    <div className={cn("space-y-5", className)}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <CopyField label="UPC" value={upc} />
        <CopyField label="ISRC" value={isrc} />
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Жанр</p>
          <p className={cn("text-sm", genre?.trim() ? "font-medium" : "text-muted-foreground")}>
            {genre?.trim() || "—"}
          </p>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Территория</p>
          <p className={cn("text-sm", territory?.trim() ? "font-medium" : "text-muted-foreground")}>
            {territory?.trim() || "—"}
          </p>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Смартлинк</p>
          <div className="flex items-center gap-1.5 min-w-0">
            {smartlinkUrl ? (
              <>
                <a
                  href={smartlinkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 truncate text-sm font-medium hover:underline"
                >
                  {smartlinkUrl}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  asChild
                >
                  <a
                    href={smartlinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Открыть смартлинк"
                    title="Открыть"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Ещё не создан</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Площадки</p>
        <div className="flex flex-wrap gap-5 sm:gap-6">
          {SMARTLINK_PLATFORMS.map((platform) => {
            const url = platformLinks?.[platform.key]?.trim() || ""
            const active = url.length > 0
            const content = (
              <span
                className="inline-flex h-10 w-10 items-center justify-center"
                title={active ? platform.label : `${platform.label} — ссылки пока нет`}
              >
                <PlatformGlyph platformKey={platform.key} active={active} />
              </span>
            )
            if (!active) {
              return (
                <span key={platform.key} className="cursor-default">
                  {content}
                </span>
              )
            }
            return (
              <a
                key={platform.key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-110 transition-transform"
                aria-label={platform.label}
              >
                {content}
              </a>
            )
          })}
        </div>
      </div>
    </div>
  )
}
