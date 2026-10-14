"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ExternalLink, Film, MessageSquareText, Search, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { DistributionSectionTabs } from "@/components/cabinet/distribution/distribution-section-tabs"
import {
  VIDEO_CLIP_STATUS_LABELS,
  type VideoClipStatus,
  type VideoClipView,
} from "@/lib/video-clips-shared"
import { PLATFORM_ICON_SRC } from "@/lib/smartlink-platforms"
import { cn } from "@/lib/utils"

const STATUS_TONE: Record<VideoClipStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  awaiting_payment:
    "bg-amber-500/20 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300",
  on_moderation: "bg-blue-500/18 text-blue-900 dark:bg-blue-500/15 dark:text-blue-300",
  on_platforms:
    "bg-emerald-500/18 text-emerald-900 dark:bg-emerald-500/15 dark:text-emerald-300",
  rejected: "bg-zinc-500/18 text-zinc-800 dark:bg-zinc-500/15 dark:text-zinc-300",
}

const STREAMING_PLATFORMS = [
  { key: "appleMusic" as const, label: "Apple Music", icon: PLATFORM_ICON_SRC.appleMusic },
  { key: "yandex" as const, label: "Яндекс Музыка", icon: PLATFORM_ICON_SRC.yandex },
  { key: "vk" as const, label: "VK", icon: PLATFORM_ICON_SRC.vk },
]

function StreamingIcon({
  href,
  label,
  iconSrc,
}: {
  href: string | null
  label: string
  iconSrc: string
}) {
  const active = Boolean(href)
  const inner = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconSrc}
      alt=""
      className={cn(
        "h-7 w-7 object-contain transition-[opacity,transform,filter] duration-200 ease-out",
        active
          ? "opacity-100 group-hover:scale-110 group-hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]"
          : "opacity-30 grayscale"
      )}
    />
  )
  if (!active || !href) {
    return (
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-md"
        title={`${label} - ссылка появится после публикации`}
        aria-label={`${label} недоступен`}
      >
        {inner}
      </span>
    )
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors duration-200 hover:bg-muted/60"
      title={label}
      aria-label={label}
    >
      {inner}
    </a>
  )
}

function VideoClipCard({ clip }: { clip: VideoClipView }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
          {clip.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clip.coverUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
          ) : (
            <Film className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate leading-tight">{clip.title}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                <p className="text-sm text-muted-foreground truncate max-w-[10rem]">
                  {clip.artist}
                </p>
                <span
                  className={cn(
                    "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                    STATUS_TONE[clip.status]
                  )}
                >
                  {VIDEO_CLIP_STATUS_LABELS[clip.status]}
                </span>
                {clip.fileUrl ? (
                  <Button asChild variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                    <a href={clip.fileUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-3.5 w-3.5 mr-1" />
                      Исходник
                    </a>
                  </Button>
                ) : null}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      disabled={!clip.comment}
                    >
                      <MessageSquareText className="h-3.5 w-3.5 mr-1" />
                      Пожелания
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Комментарии и пожелания</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                      {clip.comment || "Комментарий не указан"}
                    </p>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
              {STREAMING_PLATFORMS.map((p) => (
                <StreamingIcon
                  key={p.key}
                  href={clip.platformLinks[p.key]}
                  label={p.label}
                  iconSrc={p.icon}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function VideoClipsPageContent() {
  const [clips, setClips] = useState<VideoClipView[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/video-clips", { credentials: "include" })
        if (!res.ok) {
          if (!cancelled) setClips([])
          return
        }
        const data = (await res.json()) as { clips?: VideoClipView[] }
        if (!cancelled) setClips(data.clips ?? [])
      } catch {
        if (!cancelled) setClips([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return clips
    return clips.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.artist.toLowerCase().includes(q)
    )
  }, [clips, query])

  return (
    <div className="w-full max-w-none space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight leading-none md:text-3xl">
            Дистрибуция
          </h1>
          <DistributionSectionTabs active="videos" />
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-[16rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию или артисту"
              className="pl-9 h-9"
              aria-label="Поиск клипов"
            />
          </div>
          <Button asChild>
            <Link href="/cabinet/distribution/music-video/upload">
              <Upload className="h-4 w-4 mr-2" />
              Загрузить клип
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : clips.length === 0 ? (
        <EmptyState
          title="Видеоклипов пока нет"
          description="Загрузите готовый клип для доставки на Яндекс, VK и другие площадки"
          icon={Film}
          action={
            <Button asChild>
              <Link href="/cabinet/distribution/music-video/upload">Загрузить клип</Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте другой поисковый запрос"
          icon={Search}
          action={
            <Button variant="outline" onClick={() => setQuery("")}>
              Сбросить поиск
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((clip) => (
            <VideoClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      )}
    </div>
  )
}

export function VideoClipsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <VideoClipsPageContent />
    </Suspense>
  )
}
