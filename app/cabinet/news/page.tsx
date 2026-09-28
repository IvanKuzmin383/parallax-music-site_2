"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { AnnouncementBody } from "@/components/announcement-body"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { Spinner } from "@/components/ui/spinner"

type NewsItem = {
  id: string
  title: string
  body: string
  createdAt: string
}

export default function CabinetNewsPage() {
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

      <div className="space-y-4">
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-border/60 bg-card/70 px-4 py-4 sm:px-5 sm:py-5"
          >
            <header className="mb-3 space-y-1">
              <h2 className="text-base font-semibold leading-snug sm:text-lg">{item.title}</h2>
              {item.createdAt ? (
                <time
                  dateTime={item.createdAt}
                  className="block text-xs text-muted-foreground"
                >
                  {format(new Date(item.createdAt), "d MMMM yyyy", { locale: ru })}
                </time>
              ) : null}
            </header>
            <AnnouncementBody
              body={item.body}
              className="text-sm text-muted-foreground leading-relaxed"
            />
          </article>
        ))}
      </div>
    </div>
  )
}
