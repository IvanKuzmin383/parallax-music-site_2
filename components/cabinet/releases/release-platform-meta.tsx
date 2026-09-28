"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SMARTLINK_PLATFORMS, type PlatformLinks, type PlatformLinkKey } from "@/lib/smartlink-platforms"

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

function PlatformGlyph({ platformKey }: { platformKey: PlatformLinkKey }) {
  const common = "h-5 w-5"
  switch (platformKey) {
    case "spotify":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
      )
    case "appleMusic":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
        </svg>
      )
    case "yandex":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm1.2 18.6h-2.4V9.9H8.4V7.8h4.8v10.8zm0-13.2h-2.4V3.6h2.4v1.8z" />
        </svg>
      )
    case "youtubeMusic":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
          <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 2.16c5.424 0 9.84 4.416 9.84 9.84S17.424 21.84 12 21.84 2.16 17.424 2.16 12 6.576 2.16 12 2.16zM9.6 7.2v9.6l8.4-4.8-8.4-4.8z" />
        </svg>
      )
    case "vk":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
          <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.372 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.49-.085.744-.576.744z" />
        </svg>
      )
    case "deezer":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
          <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.533 8.227v3.027h5.189V8.227H6.533zm12.277 0v3.027H24V8.227h-5.19zM0 12.319v3.027h5.189v-3.027H0zm6.533 0v3.027h5.189v-3.027H6.533zm6.241 0v3.027h5.189v-3.027h-5.19zm6.243 0v3.027H24v-3.027h-5.19zM0 16.387v3.027h5.189v-3.027H0zm6.533 0v3.027h5.189v-3.027H6.533zm6.241 0v3.027h5.189v-3.027h-5.19zm6.243 0v3.027H24v-3.027h-5.19z" />
        </svg>
      )
    case "sberzvuk":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 3.2c1.8 0 3.4.7 4.6 1.9l-1.5 1.5A4.8 4.8 0 007.4 12a4.8 4.8 0 007.7 3.4l1.5 1.5A6.8 6.8 0 015.2 12 6.8 6.8 0 0112 5.2zm0 3.2a3.6 3.6 0 012.5 6.1l-1.4-1.4A1.6 1.6 0 0012 10.4a1.6 1.6 0 00-1.1 2.7l-1.4 1.4A3.6 3.6 0 0112 8.4z" />
        </svg>
      )
    case "kion":
      return (
        <svg viewBox="0 0 24 24" className={common} fill="currentColor" aria-hidden>
          <path d="M4 4h6.5l3.5 5.5L17.5 4H22l-6 8 6 8h-4.5L14 14.5 10.5 20H4l6-8L4 4z" />
        </svg>
      )
    default:
      return null
  }
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
        <CopyField label="Смартлинк" value={smartlinkUrl} emptyText="Ещё не создан" />
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Площадки</p>
        <div className="flex flex-wrap gap-2">
          {SMARTLINK_PLATFORMS.map((platform) => {
            const url = platformLinks?.[platform.key]?.trim() || ""
            const active = url.length > 0
            const content = (
              <span
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                  active
                    ? "bg-foreground/10 text-foreground shadow-[0_0_18px_-4px_rgba(255,255,255,0.45)] ring-1 ring-foreground/25"
                    : "bg-muted/40 text-muted-foreground/35",
                )}
                title={active ? platform.label : `${platform.label} — ссылки пока нет`}
              >
                <PlatformGlyph platformKey={platform.key} />
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
                className="hover:scale-105 transition-transform"
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
