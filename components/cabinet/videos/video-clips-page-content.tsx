"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Film, Search, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { Spinner } from "@/components/ui/spinner"
import { DistributionSectionTabs } from "@/components/cabinet/distribution/distribution-section-tabs"
import {
  VIDEO_CLIP_STATUS_LABELS,
  type VideoClipStatus,
  type VideoClipView,
} from "@/lib/video-clips-shared"
import { cn } from "@/lib/utils"

const STATUS_TONE: Record<VideoClipStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  awaiting_payment: "bg-amber-500/15 text-amber-300",
  on_moderation: "bg-blue-500/15 text-blue-300",
  on_platforms: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-zinc-500/15 text-zinc-300",
}

function VideoClipCard({ clip }: { clip: VideoClipView }) {
  return (
    <div className="rounded-xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted">
          {clip.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clip.coverUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <Film className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium truncate">{clip.title}</p>
          <p className="text-sm text-muted-foreground truncate">{clip.artist}</p>
          <span
            className={cn(
              "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
              STATUS_TONE[clip.status]
            )}
          >
            {VIDEO_CLIP_STATUS_LABELS[clip.status]}
          </span>
        </div>
      </div>
      {clip.platforms.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Площадки: {clip.platforms.join(", ")}
        </p>
      ) : null}
      {clip.releaseDate ? (
        <p className="text-xs text-muted-foreground">Дата: {clip.releaseDate}</p>
      ) : null}
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
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <h1 className="text-2xl font-bold tracking-tight leading-tight md:text-3xl">
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
            <Link href="/cabinet/design/music-video">
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
              <Link href="/cabinet/design/music-video">Загрузить клип</Link>
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
