"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Check, Copy, ExternalLink, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SMARTLINK_PLATFORMS, PLATFORM_ICON_SRC, type PlatformLinks, type PlatformLinkKey } from "@/lib/smartlink-platforms"
import { smartlinkPublicUrl } from "@/lib/smartlink-public-origin"

function CopyField({
  label,
  value,
  emptyText = "-",
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

function PlatformGlyph({ platformKey }: { platformKey: PlatformLinkKey }) {
  return (
    <img
      src={PLATFORM_ICON_SRC[platformKey]}
      alt=""
      className="h-8 w-8 shrink-0 rounded-[22%] object-contain"
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
  /** id релиза/трека для ссылки на редактор смартлинка */
  smartlinkEditHref?: string | null
  className?: string
}

export function ReleasePlatformMeta({
  upc,
  isrc,
  genre,
  territory,
  smartlinkSlug,
  platformLinks,
  smartlinkEditHref,
  className,
}: ReleasePlatformMetaProps) {
  const [smartlinkUrl, setSmartlinkUrl] = useState<string | null>(null)

  useEffect(() => {
    const slug = smartlinkSlug?.trim()
    if (!slug) {
      setSmartlinkUrl(null)
      return
    }
    setSmartlinkUrl(smartlinkPublicUrl(slug))
  }, [smartlinkSlug])

  const linkedPlatforms = SMARTLINK_PLATFORMS.filter((platform) =>
    Boolean(platformLinks?.[platform.key]?.trim())
  )

  return (
    <div className={cn("min-w-0 space-y-4", className)}>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <CopyField label="UPC" value={upc} />
        <CopyField label="ISRC" value={isrc} />
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Жанр</p>
          <p className={cn("text-sm", genre?.trim() ? "font-medium" : "text-muted-foreground")}>
            {genre?.trim() || "-"}
          </p>
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Территория</p>
          <p className={cn("text-sm", territory?.trim() ? "font-medium" : "text-muted-foreground")}>
            {territory?.trim() || "-"}
          </p>
        </div>
        <div className="col-span-2 min-w-0 space-y-1">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Смартлинк</p>
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
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
            {smartlinkEditHref ? (
              <Button type="button" variant="outline" size="sm" className="h-7 shrink-0 gap-1 px-2" asChild>
                <Link href={smartlinkEditHref}>
                  <Pencil className="h-3.5 w-3.5" />
                  {smartlinkUrl ? "Редактировать" : "Создать смартлинк"}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Площадки</p>
        {linkedPlatforms.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ссылок на площадки пока нет</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {linkedPlatforms.map((platform) => {
              const url = platformLinks?.[platform.key]?.trim() || ""
              return (
                <a
                  key={platform.key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center transition-transform hover:scale-110"
                  aria-label={platform.label}
                  title={platform.label}
                >
                  <PlatformGlyph platformKey={platform.key} />
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
