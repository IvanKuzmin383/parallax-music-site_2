"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { AnnouncementBody } from "@/components/announcement-body"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"

type NewsItem = {
  id: string
  title: string
  body: string
  createdAt: string
}

const PREVIEW_MAX = 160

export default function CabinetNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<NewsItem | null>(null)

  const load = useCallback(async () => {
    setError(null)
    const res = await fetch("/api/cabinet/announcements?all=1", { credentials: "include" })
    if (!res.ok) {
      setItems([])
      setError("Не удалось загрузить новости")
      return
    }
    const data = await res.json()
    setItems((data.announcements || []) as NewsItem[])
  }, [])

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-none space-y-5">
      <PageHeader title="Новости" description="Объявления и обновления лейбла" />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!error && items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока нет новостей</p>
      ) : null}

      <div className="space-y-3">
        {items.map((item) => {
          const bodyText = (item.body || "").trim()
          const needsMore = bodyText.length > PREVIEW_MAX

          return (
            <article
              key={item.id}
              className="rounded-xl border border-border/60 bg-card/70 px-4 py-3.5 sm:px-5"
            >
              <header className="mb-2 space-y-1">
                <h2 className="text-base font-semibold leading-snug sm:text-lg">{item.title}</h2>
                {item.createdAt ? (
                  <time dateTime={item.createdAt} className="block text-xs text-muted-foreground">
                    {format(new Date(item.createdAt), "d MMMM yyyy", { locale: ru })}
                  </time>
                ) : null}
              </header>
              {bodyText ? (
                <div className={needsMore ? "line-clamp-4" : undefined}>
                  <AnnouncementBody
                    body={item.body}
                    className="text-sm leading-relaxed text-muted-foreground"
                  />
                </div>
              ) : null}
              {needsMore ? (
                <button
                  type="button"
                  className="mt-2 text-sm font-medium text-primary underline-offset-2 hover:underline"
                  onClick={() => setSelected(item)}
                >
                  Читать полностью
                </button>
              ) : null}
            </article>
          )
        })}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="flex max-h-[90vh] w-[95vw] flex-col gap-0 overflow-hidden sm:max-w-2xl">
          {selected ? (
            <>
              <DialogHeader className="shrink-0 space-y-1.5 pr-6 text-left">
                <DialogTitle className="text-left leading-snug">{selected.title}</DialogTitle>
                {selected.createdAt ? (
                  <DialogDescription className="text-left">
                    {format(new Date(selected.createdAt), "d MMMM yyyy", { locale: ru })}
                  </DialogDescription>
                ) : (
                  <DialogDescription className="sr-only">Текст новости</DialogDescription>
                )}
              </DialogHeader>
              <div className="cabinet-sidebar-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
                <AnnouncementBody
                  body={selected.body}
                  className="text-sm leading-relaxed text-muted-foreground"
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
