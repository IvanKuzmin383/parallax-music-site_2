"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MUSIC_PLATFORM_LABELS, type MusicPlatformKey } from "@/lib/music-stats-shared"

const PAGE_SIZE = 15
const PLATFORM_KEYS = Object.keys(MUSIC_PLATFORM_LABELS) as MusicPlatformKey[]

type AdminCabinetMusicTrackMapRow = {
  userId: string
  platformKey: MusicPlatformKey
  trackKey: string
  cabinetTrackId: string
  matchedAt: string
  importTrackTitle: string | null
  importTrackAuthor: string | null
  cabinetTrackName: string | null
  cabinetArtistName: string | null
}

type PageResponse = {
  rows: AdminCabinetMusicTrackMapRow[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

type Filters = {
  platformKey: "all" | MusicPlatformKey
  userId: string
  trackKey: string
  cabinetTrackId: string
}

const DEFAULT_FILTERS: Filters = {
  platformKey: "all",
  userId: "",
  trackKey: "",
  cabinetTrackId: "",
}

function rowKey(row: Pick<AdminCabinetMusicTrackMapRow, "userId" | "platformKey" | "trackKey">): string {
  return `${row.userId}::${row.platformKey}::${row.trackKey}`
}

export default function AdminMusicTrackMapPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [rows, setRows] = useState<AdminCabinetMusicTrackMapRow[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const [draftFilters, setDraftFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [appliedFilters, setAppliedFilters] = useState<Filters>(DEFAULT_FILTERS)

  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editingCabinetTrackId, setEditingCabinetTrackId] = useState("")
  const [saving, setSaving] = useState(false)

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const apiQuery = useMemo(() => {
    const params = new URLSearchParams()
    params.set("limit", String(PAGE_SIZE))
    params.set("offset", String(offset))
    if (appliedFilters.platformKey !== "all") params.set("platformKey", appliedFilters.platformKey)
    if (appliedFilters.userId.trim()) params.set("userId", appliedFilters.userId.trim())
    if (appliedFilters.trackKey.trim()) params.set("trackKey", appliedFilters.trackKey.trim())
    if (appliedFilters.cabinetTrackId.trim()) params.set("cabinetTrackId", appliedFilters.cabinetTrackId.trim())
    return params.toString()
  }, [appliedFilters, offset])

  const loadPage = async () => {
    const response = await fetch(`/api/admin/music-stats/track-map?${apiQuery}`, {
      credentials: "include",
    })

    if (response.status === 401) {
      setIsAuthenticated(false)
      return
    }
    if (!response.ok) {
      throw new Error("load_failed")
    }

    const data = (await response.json()) as PageResponse
    setRows(data.rows ?? [])
    setTotal(data.total ?? 0)
    setHasMore(Boolean(data.hasMore))
    setIsAuthenticated(true)
  }

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setLoading(true)
      try {
        await loadPage()
      } catch {
        if (!cancelled) toast.error("Не удалось загрузить таблицу сопоставлений")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [apiQuery])

  const applyFilters = () => {
    setOffset(0)
    setAppliedFilters({
      platformKey: draftFilters.platformKey,
      userId: draftFilters.userId.trim(),
      trackKey: draftFilters.trackKey.trim(),
      cabinetTrackId: draftFilters.cabinetTrackId.trim(),
    })
  }

  const resetFilters = () => {
    setOffset(0)
    setDraftFilters(DEFAULT_FILTERS)
    setAppliedFilters(DEFAULT_FILTERS)
  }

  const startEdit = (row: AdminCabinetMusicTrackMapRow) => {
    setEditingKey(rowKey(row))
    setEditingCabinetTrackId(row.cabinetTrackId)
  }

  const cancelEdit = () => {
    setEditingKey(null)
    setEditingCabinetTrackId("")
  }

  const saveEdit = async (row: AdminCabinetMusicTrackMapRow) => {
    const cabinetTrackId = editingCabinetTrackId.trim()
    if (!cabinetTrackId) {
      toast.error("Укажите cabinetTrackId")
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/music-stats/track-map", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId: row.userId,
          platformKey: row.platformKey,
          trackKey: row.trackKey,
          cabinetTrackId,
        }),
      })
      const data = (await response.json().catch(() => null)) as { error?: string } | null
      if (!response.ok) {
        toast.error(data?.error || "Не удалось сохранить изменение")
        return
      }
      toast.success("Сопоставление обновлено")
      cancelEdit()
      await loadPage()
    } catch {
      toast.error("Не удалось сохранить изменение")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.replace("/admin26081993")
    return null
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <AdminSectionNav active="music-track-map" />

        <div>
          <h1 className="text-2xl font-bold">Маппинг треков Music Stats</h1>
          <p className="text-muted-foreground text-sm">
            Просмотр и ручная корректировка таблицы `cabinet_music_track_map`.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Площадка</Label>
                <select
                  id="platform"
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                  value={draftFilters.platformKey}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      platformKey: e.target.value as Filters["platformKey"],
                    }))
                  }
                >
                  <option value="all">Все площадки</option>
                  {PLATFORM_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {MUSIC_PLATFORM_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="userId">User ID (email)</Label>
                <Input
                  id="userId"
                  value={draftFilters.userId}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, userId: e.target.value }))
                  }
                  placeholder="artist@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trackKey">Track Key</Label>
                <Input
                  id="trackKey"
                  value={draftFilters.trackKey}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, trackKey: e.target.value }))
                  }
                  placeholder="поиск по ключу трека"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cabinetTrackId">Cabinet Track ID</Label>
                <Input
                  id="cabinetTrackId"
                  value={draftFilters.cabinetTrackId}
                  onChange={(e) =>
                    setDraftFilters((prev) => ({ ...prev, cabinetTrackId: e.target.value }))
                  }
                  placeholder="uuid трека"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={applyFilters}>Применить</Button>
              <Button variant="outline" onClick={resetFilters}>
                Сбросить
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Записи ({total.toLocaleString("ru-RU")})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Площадка</TableHead>
                    <TableHead>Track Key</TableHead>
                    <TableHead>Импорт (author/title)</TableHead>
                    <TableHead>Cabinet Track ID</TableHead>
                    <TableHead>Трек из кабинета</TableHead>
                    <TableHead>Matched At</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Ничего не найдено
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => {
                      const key = rowKey(row)
                      const isEditing = editingKey === key
                      return (
                        <TableRow key={key}>
                          <TableCell className="whitespace-nowrap">{row.userId}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {MUSIC_PLATFORM_LABELS[row.platformKey]}
                          </TableCell>
                          <TableCell className="max-w-[320px] break-all text-xs">{row.trackKey}</TableCell>
                          <TableCell className="max-w-[260px] text-xs">
                            {row.importTrackAuthor || "—"} • {row.importTrackTitle || "—"}
                          </TableCell>
                          <TableCell className="min-w-[260px]">
                            {isEditing ? (
                              <Input
                                value={editingCabinetTrackId}
                                onChange={(e) => setEditingCabinetTrackId(e.target.value)}
                                disabled={saving}
                              />
                            ) : (
                              <span className="text-xs break-all">{row.cabinetTrackId}</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[260px] text-xs">
                            {row.cabinetArtistName || "—"} • {row.cabinetTrackName || "—"}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-xs">
                            {new Date(row.matchedAt).toLocaleString("ru-RU")}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {isEditing ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => void saveEdit(row)}
                                  disabled={saving}
                                >
                                  Сохранить
                                </Button>
                                <Button size="sm" variant="outline" onClick={cancelEdit} disabled={saving}>
                                  Отмена
                                </Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                                Изменить
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Страница {currentPage} из {totalPages} • по {PAGE_SIZE} строк
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                  disabled={offset === 0}
                >
                  Назад
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                  disabled={!hasMore}
                >
                  Вперед
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

