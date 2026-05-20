"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Download, Search } from "lucide-react"

const PAGE_SIZE = 15

type LegalEvent = {
  id: string
  userEmail: string
  documentVersionId: string
  revisionLabel: string
  contentSha256: string
  eventType: string
  resourceType: string
  resourceId: string
  occurredAt: string
  clientIp: string | null
  userAgent: string | null
  metadataJson: string | null
  trackName: string | null
}

export default function AdminLegalAcceptancePage() {
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [emailFilter, setEmailFilter] = useState("")
  const [appliedEmailFilter, setAppliedEmailFilter] = useState<string | null>(null)
  const [events, setEvents] = useState<LegalEvent[]>([])
  const [total, setTotal] = useState(0)
  const [listLoading, setListLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)

  const fetchPage = useCallback(
    async (opts: { offset: number; append: boolean; email?: string | null }) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(opts.offset),
      })
      const email = opts.email?.trim()
      if (email) params.set("email", email)

      const res = await fetch(`/api/admin/legal-acceptance?${params}`, {
        credentials: "include",
      })
      if (res.status === 401) {
        setIsAuthenticated(false)
        toast.error("Нет доступа")
        return null
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error((err as { error?: string }).error || "Ошибка загрузки")
        return null
      }
      const data = await res.json()
      setIsAuthenticated(true)
      const batch = (data.events || []) as LegalEvent[]
      setEvents((prev) => (opts.append ? [...prev, ...batch] : batch))
      setTotal(typeof data.total === "number" ? data.total : batch.length)
      setHasMore(Boolean(data.hasMore))
      return data
    },
    []
  )

  const loadFirstPage = useCallback(
    async (email?: string | null) => {
      setListLoading(true)
      try {
        await fetchPage({ offset: 0, append: false, email })
      } catch {
        toast.error("Ошибка сети")
      } finally {
        setListLoading(false)
      }
    },
    [fetchPage]
  )

  useEffect(() => {
    fetch("/api/admin/cabinet-users", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) setIsAuthenticated(false)
        else {
          setIsAuthenticated(true)
          return loadFirstPage(null)
        }
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false))
  }, [loadFirstPage])

  const applyEmailFilter = () => {
    const trimmed = emailFilter.trim()
    setAppliedEmailFilter(trimmed || null)
    void loadFirstPage(trimmed || null)
  }

  const clearEmailFilter = () => {
    setEmailFilter("")
    setAppliedEmailFilter(null)
    void loadFirstPage(null)
  }

  const loadMore = async () => {
    setListLoading(true)
    try {
      await fetchPage({
        offset: events.length,
        append: true,
        email: appliedEmailFilter,
      })
    } catch {
      toast.error("Ошибка сети")
    } finally {
      setListLoading(false)
    }
  }

  const downloadCsv = async () => {
    try {
      const params = new URLSearchParams({ format: "csv" })
      if (appliedEmailFilter) params.set("email", appliedEmailFilter)
      const res = await fetch(`/api/admin/legal-acceptance?${params}`, {
        credentials: "include",
      })
      if (!res.ok) {
        toast.error("Не удалось скачать CSV")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = appliedEmailFilter
        ? `legal-acceptance-${appliedEmailFilter.replace(/@/g, "_at_")}.csv`
        : "legal-acceptance-all.csv"
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("Ошибка скачивания")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 pt-20">
        <p className="text-muted-foreground">Загрузка…</p>
      </div>
    )
  }

  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen bg-background p-6 pt-20">
        <p className="text-destructive">Требуется вход в админку.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="max-w-6xl mx-auto space-y-6">
        <AdminSectionNav active="legal-acceptance" />
        <Card>
          <CardHeader>
            <CardTitle>Акцепты оферты / лицензии по трекам</CardTitle>
            <p className="text-sm text-muted-foreground">
              Журнал: какая редакция публичной оферты привязана к загрузке трека (включая backfill для старых
              релизов). Показано {events.length} из {total}.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label htmlFor="legal-email">Фильтр по email (необязательно)</Label>
                <Input
                  id="legal-email"
                  type="email"
                  placeholder="user@example.com"
                  value={emailFilter}
                  onChange={(e) => setEmailFilter(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && applyEmailFilter()}
                />
              </div>
              <Button type="button" disabled={listLoading} onClick={applyEmailFilter}>
                <Search className="h-4 w-4 mr-2" />
                {listLoading ? "Загрузка…" : "Фильтр"}
              </Button>
              {appliedEmailFilter ? (
                <Button type="button" variant="ghost" disabled={listLoading} onClick={clearEmailFilter}>
                  Сбросить фильтр
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={downloadCsv}>
                <Download className="h-4 w-4 mr-2" />
                Скачать CSV
              </Button>
            </div>

            {appliedEmailFilter ? (
              <p className="text-sm text-muted-foreground">
                Фильтр: <span className="font-medium text-foreground">{appliedEmailFilter}</span>
              </p>
            ) : null}

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-2 font-medium">Время (UTC)</th>
                    <th className="p-2 font-medium">Email</th>
                    <th className="p-2 font-medium">Трек</th>
                    <th className="p-2 font-medium">ID трека</th>
                    <th className="p-2 font-medium">Редакция оферты</th>
                    <th className="p-2 font-medium">SHA-256</th>
                    <th className="p-2 font-medium">IP</th>
                    <th className="p-2 font-medium">Метаданные</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 && !listLoading && (
                    <tr>
                      <td colSpan={8} className="p-4 text-muted-foreground text-center">
                        Нет записей
                      </td>
                    </tr>
                  )}
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b border-border/60">
                      <td className="p-2 whitespace-nowrap align-top">{ev.occurredAt}</td>
                      <td className="p-2 align-top max-w-[160px] break-all">{ev.userEmail}</td>
                      <td className="p-2 align-top max-w-[180px]">{ev.trackName ?? "-"}</td>
                      <td className="p-2 align-top font-mono text-xs break-all">{ev.resourceId}</td>
                      <td className="p-2 align-top">{ev.revisionLabel}</td>
                      <td className="p-2 align-top font-mono text-xs break-all max-w-[120px]">
                        {ev.contentSha256.slice(0, 16)}…
                      </td>
                      <td className="p-2 align-top whitespace-nowrap">{ev.clientIp ?? "-"}</td>
                      <td className="p-2 align-top text-xs text-muted-foreground max-w-[200px] break-words">
                        {ev.metadataJson ?? "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {hasMore ? (
              <div className="flex flex-col items-center gap-2 pt-2">
                <Button type="button" variant="outline" disabled={listLoading} onClick={() => void loadMore()}>
                  {listLoading ? "Загрузка…" : `Еще (+${PAGE_SIZE})`}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
