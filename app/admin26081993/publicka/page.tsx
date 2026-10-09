"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  PUBLICKA_RATE_RUB,
  PUBLICKA_STATUS_LABELS,
  type PublickaPlacementStatus,
  type PublickaPlacementView,
} from "@/lib/publicka-shared"

type ImportResult = {
  fileName: string
  ok: boolean
  error?: string
  warnings?: string[]
  totalPlays?: number
  matchedRows?: number
  earningsCreditedRub?: number
  createdPlacements?: number
  skippedDuplicateFile?: boolean
}

export default function AdminPublickaPage() {
  const [placements, setPlacements] = useState<PublickaPlacementView[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<ImportResult[]>([])

  const [email, setEmail] = useState("")
  const [title, setTitle] = useState("")
  const [artist, setArtist] = useState("")
  const [creating, setCreating] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/publicka/placements?limit=100", {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Ошибка загрузки")
      const data = (await res.json()) as { rows?: PublickaPlacementView[] }
      setPlacements(data.rows ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function onImport(files: FileList | null) {
    if (!files?.length) return
    setImporting(true)
    setResults([])
    try {
      const form = new FormData()
      for (const file of Array.from(files)) {
        form.append("files", file)
      }
      const res = await fetch("/api/admin/publicka/import", {
        method: "POST",
        body: form,
        credentials: "include",
      })
      const data = (await res.json()) as { results?: ImportResult[]; error?: string }
      if (!res.ok) throw new Error(data.error || "Ошибка импорта")
      setResults(data.results ?? [])
      toast.success("Импорт завершён")
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка импорта")
    } finally {
      setImporting(false)
    }
  }

  async function onCreate() {
    if (!email.trim() || !title.trim()) {
      toast.error("Укажите email и название")
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/admin/publicka/placements", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          title: title.trim(),
          artist: artist.trim() || undefined,
          status: "active",
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || "Не удалось создать")
      toast.success("Размещение добавлено")
      setEmail("")
      setTitle("")
      setArtist("")
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    } finally {
      setCreating(false)
    }
  }

  async function onStatusChange(id: string, status: PublickaPlacementStatus) {
    try {
      const res = await fetch("/api/admin/publicka/placements", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error || "Ошибка")
      }
      toast.success("Статус обновлён")
      await reload()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка")
    }
  }

  return (
    <div className="space-y-4 p-4">
      <AdminSectionNav active="publicka" />
      <div>
        <h1 className="text-2xl font-bold">Публичка (БизнесЗвук)</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Размещения клиентов, импорт Excel/CSV и начисление {PUBLICKA_RATE_RUB} ₽ за
          прослушивание в роялти.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Импорт статистики</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Колонки: <code>email</code>, <code>название</code> / <code>трек</code>,{" "}
              <code>дата</code> (ДД.ММ.ГГГГ или ГГГГ-ММ-ДД), <code>прослушивания</code>.
              Опционально: <code>исполнитель</code>, <code>город</code>.
            </p>
            <Input
              type="file"
              accept=".xlsx,.csv"
              multiple
              disabled={importing}
              onChange={(e) => void onImport(e.target.files)}
            />
            {results.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {results.map((r) => (
                  <li
                    key={r.fileName}
                    className={r.ok ? "text-emerald-400" : "text-destructive"}
                  >
                    {r.fileName}:{" "}
                    {r.ok
                      ? r.skippedDuplicateFile
                        ? "файл уже загружался"
                        : `ok, plays=${r.totalPlays}, matched=${r.matchedRows}, credited=${r.earningsCreditedRub} ₽, new=${r.createdPlacements}`
                      : r.error}
                    {r.warnings?.length ? (
                      <span className="block text-amber-400 text-xs">
                        {r.warnings.slice(0, 3).join("; ")}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Добавить размещение</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Email клиента"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              placeholder="Название трека"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Исполнитель (необязательно)"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
            />
            <Button onClick={() => void onCreate()} disabled={creating}>
              {creating ? "Создание..." : "Создать"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Размещения ({placements.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          ) : placements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока пусто</p>
          ) : (
            <div className="space-y-2">
              {placements.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{p.title}</p>
                    <p className="text-muted-foreground truncate">{p.artist}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {p.totalPlays.toLocaleString("ru-RU")} plays ·{" "}
                      {p.earningsRub.toLocaleString("ru-RU", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ₽
                    </p>
                  </div>
                  <Select
                    value={p.status}
                    onValueChange={(v) =>
                      void onStatusChange(p.id, v as PublickaPlacementStatus)
                    }
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PUBLICKA_STATUS_LABELS) as PublickaPlacementStatus[]).map(
                        (s) => (
                          <SelectItem key={s} value={s}>
                            {PUBLICKA_STATUS_LABELS[s]}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
