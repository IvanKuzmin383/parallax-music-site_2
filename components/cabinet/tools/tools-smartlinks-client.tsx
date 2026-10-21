"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, ExternalLink, Link2, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { smartlinkPublicUrl } from "@/lib/smartlink-public-origin"
import { cn } from "@/lib/utils"

type ListItem = {
  id: string
  slug: string
  title: string
  artistName: string
  status: string
  mode: string
  paidUntil: string | null
  publicPath: string
  publicUrl?: string | null
  isPublic: boolean
  coverUrl: string | null
  updatedAt: string
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Черновик",
  active: "Активен",
  expired: "Истёк",
  disabled: "Выключен",
}

export function ToolsSmartlinksClient() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importReleaseId, setImportReleaseId] = useState("")
  const [items, setItems] = useState<ListItem[]>([])
  const { releases, loading: releasesLoading } = useCabinetReleases()
  const importCandidates = releases.filter(
    (r) => r.kind !== "draft" && r.releaseStatus !== "draft" && r.status !== "Черновик"
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/cabinet/tools/smartlinks", { credentials: "include" })
      if (!res.ok) {
        toast.error("Не удалось загрузить смартлинки")
        return
      }
      const data = (await res.json()) as { items?: ListItem[] }
      setItems(data.items ?? [])
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
      const res = await fetch("/api/cabinet/tools/smartlinks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Новый смартлинк", artistName: "" }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok || !data.id) {
        toast.error(data.error || "Не удалось создать")
        return
      }
      window.location.href = `/cabinet/tools/smartlinks/${data.id}`
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm("Удалить смартлинк?")) return
    const res = await fetch(`/api/cabinet/tools/smartlinks/${id}`, {
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

  const importFromRelease = async () => {
    if (!importReleaseId.trim()) {
      toast.error("Выберите релиз")
      return
    }
    setImporting(true)
    try {
      const res = await fetch("/api/cabinet/tools/smartlinks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromReleaseId: importReleaseId.trim() }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok || !data.id) {
        toast.error(data.error || "Не удалось импортировать")
        return
      }
      toast.success("Смартлинк создан из релиза")
      window.location.href = `/cabinet/tools/smartlinks/${data.id}`
    } finally {
      setImporting(false)
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
            title="Смартлинки"
            className="mb-0 sm:mb-0 [&_p]:max-w-none"
            description="Отдельные страницы со ссылками на площадки для промо до релиза и анонса после выхода"
          />
          <Button type="button" onClick={() => void createNew()} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Создать
          </Button>
        </div>
      </div>

      {importCandidates.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-border/70 bg-card/30 px-4 py-3">
          <label className="min-w-[12rem] flex-1 space-y-1 text-sm">
            <span className="text-muted-foreground">Импорт из релиза</span>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={importReleaseId}
              disabled={releasesLoading || importing}
              onChange={(e) => setImportReleaseId(e.target.value)}
            >
              <option value="">Выберите релиз…</option>
              {importCandidates.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} - {r.artist}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            variant="outline"
            disabled={!importReleaseId || importing}
            onClick={() => void importFromRelease()}
          >
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Импортировать
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center">
          <Link2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Пока нет смартлинков</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Создайте страницу с обложкой, отрывком и ссылками на Spotify, VK и другие площадки.
          </p>
          <Button type="button" className="mt-4" onClick={() => void createNew()} disabled={creating}>
            Создать смартлинк
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-3 sm:p-4"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Link2 className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.title || "Без названия"}</p>
                <p className="truncate text-sm text-muted-foreground">{item.artistName || "-"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "font-medium",
                      item.isPublic ? "text-emerald-500" : "text-amber-500"
                    )}
                  >
                    {STATUS_LABEL[item.status] ?? item.status}
                  </span>
                  {" · "}
                  {item.publicUrl ?? smartlinkPublicUrl(item.slug)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {item.isPublic ? (
                  <Button size="sm" variant="outline" asChild>
                    <a
                      href={item.publicUrl ?? item.publicPath}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-1.5 h-4 w-4" />
                      Открыть
                    </a>
                  </Button>
                ) : null}
                <Button size="sm" asChild>
                  <Link href={`/cabinet/tools/smartlinks/${item.id}`}>Редактировать</Link>
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
          ))}
        </ul>
      )}
    </div>
  )
}
