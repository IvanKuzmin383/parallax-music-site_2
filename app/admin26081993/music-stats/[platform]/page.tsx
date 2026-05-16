"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { AdminSectionNav } from "@/components/admin-section-nav"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { DailyStat, MusicPlatformKey, TopTrack } from "@/lib/music-stats-shared"

interface MusicStatsResponse {
  source: string | null
  platformKey: MusicPlatformKey
  platformLabel: string
  exportedAt: string | null
  totalRows: number
  totalTracksInFile: number
  totalPlays: number
  daysCount: number
  dailyStats: DailyStat[]
  topTracks: TopTrack[]
  error?: string
}

const chartConfig = {
  totalPlays: {
    label: "Прослушивания",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export default function MusicPlatformStatsPage() {
  const router = useRouter()
  const params = useParams<{ platform: string }>()
  const platformParam = params?.platform
  const [platformKey, setPlatformKey] = useState<MusicPlatformKey | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<MusicStatsResponse | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    if (!platformParam) return
    setPlatformKey(platformParam as MusicPlatformKey)
  }, [platformParam])

  useEffect(() => {
    if (!platformKey) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/admin/music-stats?platform=${encodeURIComponent(platformKey)}`, {
          credentials: "include",
        })

        if (response.status === 401) {
          setIsAuthenticated(false)
          router.replace("/admin26081993")
          return
        }

        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { error?: string } | null
          setError(data?.error || "Не удалось загрузить статистику")
          setIsAuthenticated(true)
          return
        }

        const data = (await response.json()) as MusicStatsResponse
        setStats(data)
        setIsAuthenticated(true)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Неизвестная ошибка загрузки"
        setError(message)
        setIsAuthenticated(true)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [platformKey, router])

  const chartData = useMemo(() => {
    if (!stats?.dailyStats) return []
    return stats.dailyStats.map((item) => ({
      ...item,
      shortDate: format(new Date(item.date), "dd.MM", { locale: ru }),
    }))
  }, [stats])

  const handleImport = async () => {
    if (!platformKey) return
    if (!selectedFile) {
      setError("Выберите JSON-файл со статистикой.")
      return
    }

    setImporting(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("file", selectedFile)

      const response = await fetch(`/api/admin/music-stats?platform=${encodeURIComponent(platformKey)}`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(data?.error || "Не удалось импортировать файл")
      }

      const data = (await response.json()) as MusicStatsResponse
      setStats(data)
      setSelectedFile(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Неизвестная ошибка импорта"
      setError(message)
    } finally {
      setImporting(false)
    }
  }

  if (!platformKey) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p>Платформа не выбрана</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center">
        <p>Загрузка статистики...</p>
      </div>
    )
  }

  if (!isAuthenticated) return null

  const platformLabel = stats?.platformLabel ?? platformKey

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-6">
        <AdminSectionNav active="music-stats" />

        <div>
          <h1 className="text-2xl font-bold">Статистика прослушиваний: {platformLabel}</h1>
          <p className="text-sm text-muted-foreground">
            График суммарных прослушиваний по дням на основе JSON-экспорта. Данные сохраняются в БД.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Импорт JSON в БД</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="file"
                accept="application/json,.json"
                className="block text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-muted file:text-foreground
                  hover:file:bg-muted/70"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
              <Button onClick={() => void handleImport()} disabled={importing}>
                {importing ? "Импорт..." : "Импортировать"}
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">После импорта график будет обновлён.</p>
          </CardContent>
        </Card>

        {error ? (
          <Card>
            <CardHeader>
              <CardTitle>Ошибка</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        {stats ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Всего прослушиваний</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{stats.totalPlays.toLocaleString("ru-RU")}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Дней в статистике</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{stats.daysCount}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Треков в файле</CardTitle>
                </CardHeader>
                <CardContent className="text-2xl font-bold">{stats.totalTracksInFile}</CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Дата экспорта</CardTitle>
                </CardHeader>
                <CardContent className="text-sm font-medium">
                  {stats.exportedAt
                    ? format(new Date(stats.exportedAt), "dd.MM.yyyy HH:mm", { locale: ru })
                    : "Не указана"}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Динамика прослушиваний по дням</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[360px] w-full">
                  <AreaChart data={chartData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="shortDate" tickLine={false} axisLine={false} tickMargin={8} minTickGap={18} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            const dateValue = payload?.[0]?.payload?.date
                            if (!dateValue) return ""
                            return format(new Date(String(dateValue)), "dd MMMM yyyy", { locale: ru })
                          }}
                          formatter={(value) => [Number(value).toLocaleString("ru-RU"), "Прослушивания"]}
                        />
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="totalPlays"
                      stroke="var(--color-totalPlays)"
                      fill="var(--color-totalPlays)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Топ-10 треков по прослушиваниям</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stats.topTracks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет данных по трекам</p>
                ) : (
                  stats.topTracks.map((track, idx) => (
                    <div
                      key={`${track.author}-${track.title}`}
                      className="flex items-center justify-between border rounded-md px-3 py-2"
                    >
                      <p className="text-sm">
                        <span className="text-muted-foreground mr-2">{idx + 1}.</span>
                        {track.author} - {track.title}
                      </p>
                      <p className="text-sm font-semibold">{track.plays.toLocaleString("ru-RU")}</p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        ) : null}
      </div>
    </div>
  )
}

