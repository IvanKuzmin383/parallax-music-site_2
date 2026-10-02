"use client"

import { useCallback, useEffect, useState } from "react"
import { Check, Copy, ExternalLink } from "lucide-react"
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

/** Официальные цветные ассеты (Яндекс / КИОН / Звук). */
const PLATFORM_ICON_SRC: Partial<Record<PlatformLinkKey, string>> = {
  yandex: "/platforms/yandex.svg",
  kion: "/platforms/kion.svg",
  sberzvuk: "/platforms/sberzvuk.svg",
}

/** Фирменные знаки. Со ссылкой — цветные; без — grayscale. */
function PlatformGlyph({
  platformKey,
  active,
}: {
  platformKey: PlatformLinkKey
  active: boolean
}) {
  const box = cn("h-8 w-8 shrink-0 rounded-[22%]", !active && "grayscale opacity-45")
  const asset = PLATFORM_ICON_SRC[platformKey]
  if (asset) {
    return <img src={asset} alt="" className={cn(box, "object-contain")} draggable={false} />
  }

  switch (platformKey) {
    case "spotify":
      return (
        <svg viewBox="0 0 24 24" className={box} aria-hidden>
          <circle cx="12" cy="12" r="12" fill="#1DB954" />
          <path
            fill="#000"
            d="M16.98 10.54c-2.6-1.55-6.9-1.7-9.4-.94a.75.75 0 11-.42-1.44c2.86-.87 7.6-.7 10.62 1.1a.75.75 0 11-.8 1.28zm-.2 2.7a.62.62 0 01-.86.21c-2.17-1.33-5.48-1.72-8.05-.94a.62.62 0 11-.36-1.19c2.92-.89 6.6-.45 9.07 1.06a.62.62 0 01.2.86zm-1 2.58a.5.5 0 01-.69.16c-1.9-1.16-4.3-1.42-7.12-.78a.5.5 0 11-.23-.97c3.1-.7 5.8-.4 7.97.92a.5.5 0 01.17.67z"
          />
        </svg>
      )
    case "appleMusic":
      return (
        <svg viewBox="0 0 24 24" className={box} aria-hidden>
          <defs>
            <linearGradient id="amGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#FA233B" />
              <stop offset="100%" stopColor="#FB5C74" />
            </linearGradient>
          </defs>
          <rect width="24" height="24" rx="5.5" fill="url(#amGrad)" />
          <path
            fill="#fff"
            d="M15.3 5.2c0-.3.2-.6.5-.6.1 0 .2 0 .3.1 1.6.4 2.8 1.9 2.8 3.6v6.1a2.55 2.55 0 11-1.5-2.3V9.1c0-1.3-1-2.4-2.2-2.5-.3 0-.5-.3-.5-.6v-.8zm-4.6 3.5c0-.3.2-.5.5-.5h.1c1.5.1 2.6 1.3 2.6 2.8v4.8a2.2 2.2 0 11-1.4-2V11c0-.9-.7-1.6-1.5-1.7h-.2c-.3 0-.5-.2-.5-.5v-.1zm1.5 8.7a1.05 1.05 0 100 2.1 1.05 1.05 0 000-2.1zm4.6-1.8a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z"
          />
        </svg>
      )
    case "deezer":
      return (
        <svg viewBox="0 0 24 24" className={box} aria-hidden>
          <rect width="24" height="24" rx="5.5" fill="#121212" />
          <g transform="translate(2.8 5.6)">
            <rect x="0" y="8" width="2.6" height="4.8" rx="0.4" fill="#FF0092" />
            <rect x="3.8" y="5.2" width="2.6" height="7.6" rx="0.4" fill="#FF6A00" />
            <rect x="7.6" y="2.4" width="2.6" height="10.4" rx="0.4" fill="#FEE800" />
            <rect x="11.4" y="0" width="2.6" height="12.8" rx="0.4" fill="#00C7F2" />
            <rect x="15.2" y="3.6" width="2.6" height="9.2" rx="0.4" fill="#A238FF" />
          </g>
        </svg>
      )
    case "youtubeMusic":
      return (
        <svg viewBox="0 0 24 24" className={box} aria-hidden>
          <circle cx="12" cy="12" r="12" fill="#FF0000" />
          <circle cx="12" cy="12" r="5.2" fill="none" stroke="#fff" strokeWidth="1.6" />
          <path fill="#fff" d="M10.4 8.8v6.4l5.4-3.2-5.4-3.2z" />
        </svg>
      )
    case "vk":
      return (
        <svg viewBox="0 0 24 24" className={box} aria-hidden>
          <rect width="24" height="24" rx="5.5" fill="#0077FF" />
          <path
            fill="#fff"
            d="M12.8 16.7h.9s.3 0 .4-.2c.1-.1.1-.4.1-.4s0-1.2.6-1.4c.5-.2 1.2.9 2 1.5.6.4 1 .3 1 .3l2.1-.1s1.1-.1.6-1c0 0-.1-.2-.5-.5-.4-.3-1-.9-1.1-1.1-.1-.2 0-.4.2-.6.3-.4.8-1.1 1-1.5.2-.4 0-.6 0-.6h-2.1s-.3 0-.4.1c-.1.1-.2.4-.2.4s-.4 1-.9 1.7c-.5.7-.7.5-.7.5-.1-.1-.1-.4-.1-.7V9.6c0-.4.1-.6-.3-.7-.3 0-1-.1-1.8.8-.5.5-.7 1.1-.7 1.1s0 .3-.1.5c-.1.2-.2.2-.2.2s0 0-.2-.1c-.5-.3-1-.9-1.4-1.6-.3-.5-.5-.8-.5-.8s-.1-.2-.3-.3c-.2-.1-.4-.1-.4-.1H5.6s-.4 0-.5.2c-.1.2 0 .5 0 .5s1.8 4.2 3.9 6.3c1.9 1.9 4 1.8 4 1.8h.9z"
          />
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
