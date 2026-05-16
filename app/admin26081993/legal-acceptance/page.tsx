"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Download, Search } from "lucide-react"

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
  const [email, setEmail] = useState("")
  const [events, setEvents] = useState<LegalEvent[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [loadedForEmail, setLoadedForEmail] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/cabinet-users", { credentials: "include" })
      .then((res) => {
        if (res.status === 401) setIsAuthenticated(false)
        else setIsAuthenticated(true)
      })
      .catch(() => setIsAuthenticated(false))
      .finally(() => setLoading(false))
  }, [])

  const loadEvents = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      toast.error("Введите email пользователя ЛК")
      return
    }
    setSearchLoading(true)
    try {
      const res = await fetch(
        `/api/admin/legal-acceptance?email=${encodeURIComponent(trimmed)}`,
        { credentials: "include" }
      )
      if (res.status === 401) {
        setIsAuthenticated(false)
        toast.error("Нет доступа")
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || "Ошибка загрузки")
        return
      }
      const data = await res.json()
      setEvents(data.events || [])
      setLoadedForEmail(trimmed)
      setIsAuthenticated(true)
    } catch {
      toast.error("Ошибка сети")
    } finally {
      setSearchLoading(false)
    }
  }

  const downloadCsv = async () => {
    const trimmed = email.trim()
    if (!trimmed) {
      toast.error("Введите email")
      return
    }
    try {
      const res = await fetch(
        `/api/admin/legal-acceptance?email=${encodeURIComponent(trimmed)}&format=csv`,
        { credentials: "include" }
      )
      if (!res.ok) {
        toast.error("Не удалось скачать CSV")
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `legal-acceptance-${trimmed.replace(/@/g, "_at_")}.csv`
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
              релизов).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label htmlFor="legal-email">Email пользователя ЛК</Label>
                <Input
                  id="legal-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadEvents(email)}
                />
              </div>
              <Button
                type="button"
                disabled={searchLoading}
                onClick={() => loadEvents(email)}
              >
                <Search className="h-4 w-4 mr-2" />
                {searchLoading ? "Загрузка…" : "Показать"}
              </Button>
              <Button type="button" variant="outline" onClick={downloadCsv} disabled={!email.trim()}>
                <Download className="h-4 w-4 mr-2" />
                Скачать CSV
              </Button>
            </div>

            {loadedForEmail && (
              <p className="text-sm text-muted-foreground">
                Найдено записей: {events.length} для <span className="font-medium text-foreground">{loadedForEmail}</span>
              </p>
            )}

            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left">
                    <th className="p-2 font-medium">Время (UTC)</th>
                    <th className="p-2 font-medium">Трек</th>
                    <th className="p-2 font-medium">ID трека</th>
                    <th className="p-2 font-medium">Редакция оферты</th>
                    <th className="p-2 font-medium">SHA-256</th>
                    <th className="p-2 font-medium">IP</th>
                    <th className="p-2 font-medium">Метаданные</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length === 0 && loadedForEmail && (
                    <tr>
                      <td colSpan={7} className="p-4 text-muted-foreground text-center">
                        Нет записей
                      </td>
                    </tr>
                  )}
                  {events.map((ev) => (
                    <tr key={ev.id} className="border-b border-border/60">
                      <td className="p-2 whitespace-nowrap align-top">{ev.occurredAt}</td>
                      <td className="p-2 align-top max-w-[180px]">{ev.trackName ?? "—"}</td>
                      <td className="p-2 align-top font-mono text-xs break-all">{ev.resourceId}</td>
                      <td className="p-2 align-top">{ev.revisionLabel}</td>
                      <td className="p-2 align-top font-mono text-xs break-all max-w-[120px]">
                        {ev.contentSha256.slice(0, 16)}…
                      </td>
                      <td className="p-2 align-top whitespace-nowrap">{ev.clientIp ?? "—"}</td>
                      <td className="p-2 align-top text-xs text-muted-foreground max-w-[200px] break-words">
                        {ev.metadataJson ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
