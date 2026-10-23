"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Clapperboard, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { DEFAULT_STORY_VIDEO_PROJECT } from "@/lib/story-video-theme"
import { TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB } from "@/lib/tools-story-video-pricing"

type ListItem = {
  id: string
  name: string
  trackId: string | null
  templateLabel: string
  title: string
  artist: string
  updatedAt: string
}

export function ToolsStoryVideoListClient() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [items, setItems] = useState<ListItem[]>([])
  const [max, setMax] = useState(30)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/cabinet/tools/story-video/drafts", {
        credentials: "include",
      })
      if (!res.ok) {
        toast.error("Не удалось загрузить карточки")
        return
      }
      const data = (await res.json()) as { items?: ListItem[]; max?: number }
      setItems(data.items ?? [])
      if (typeof data.max === "number") setMax(data.max)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createNew = async () => {
    setCreating(true)
    try {
      const res = await fetch("/api/cabinet/tools/story-video/drafts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Новый сниппет",
          trackId: null,
          project: DEFAULT_STORY_VIDEO_PROJECT,
        }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok || !data.id) {
        toast.error(data.error || "Не удалось создать")
        return
      }
      window.location.href = `/cabinet/tools/story-video/${data.id}`
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Удалить карточку сниппета?")) return
    const res = await fetch(`/api/cabinet/tools/story-video/drafts/${id}`, {
      method: "DELETE",
      credentials: "include",
    })
    if (!res.ok) {
      toast.error("Не удалось удалить")
      return
    }
    toast.success("Удалено")
    void load()
  }

  const formatUpdated = (iso: string) => {
    try {
      return new Date(iso).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return ""
    }
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="space-y-3">
        <Link
          href="/cabinet/tools"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          К инструментам
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <PageHeader
            title="Сниппеты"
            className="mb-0 sm:mb-0 [&_p]:max-w-none"
            description={`Отрывок 5-30 сек для Reels / Shorts / TikTok. Превью с водяным знаком. 1 скачивание бесплатно, далее ${TOOLS_STORY_VIDEO_DOWNLOAD_PRICE_RUB} ₽.`}
          />
          <Button type="button" onClick={() => void createNew()} disabled={creating}>
            {creating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Создать
          </Button>
        </div>
        {items.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            {items.length}/{max} карточек
          </p>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <Clapperboard className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Пока нет сниппетов</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Создайте карточку, настройте обложку и хук - потом скачайте видео.
          </p>
          <Button type="button" className="mt-4" onClick={() => void createNew()} disabled={creating}>
            Создать сниппет
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const subtitle =
              item.artist || item.title
                ? [item.artist, item.title].filter(Boolean).join(" - ")
                : item.templateLabel
            const updated = formatUpdated(item.updatedAt)
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-3 sm:p-4"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.trackId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/cabinet/uploads/cover/${item.trackId}`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Clapperboard className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.name || "Без названия"}</p>
                  <p className="truncate text-sm text-muted-foreground">{subtitle || "-"}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.templateLabel}
                    {updated ? ` · ${updated}` : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" asChild>
                    <Link href={`/cabinet/tools/story-video/${item.id}`}>Редактировать</Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive"
                    onClick={() => void remove(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
