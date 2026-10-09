"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { StatsSectionTabs } from "@/components/cabinet/stats/stats-section-tabs"
import {
  PUBLICKA_RATE_RUB,
  type PublickaStatsResponse,
} from "@/lib/publicka-shared"
import { Spinner } from "@/components/ui/spinner"

const chartConfig = {
  plays: { label: "Прослушивания", color: "hsl(var(--primary))" },
} satisfies ChartConfig

export function PublickaStatsPanel() {
  const [stats, setStats] = useState<PublickaStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/publicka/stats", { credentials: "include" })
        if (!res.ok) {
          throw new Error("Не удалось загрузить статистику")
        }
        const data = (await res.json()) as PublickaStatsResponse
        if (!cancelled) setStats(data)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Ошибка загрузки")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const dailyChart = useMemo(
    () =>
      (stats?.dailyStats ?? []).map((d) => ({
        date: d.date,
        shortDate: d.date.slice(5),
        plays: d.totalPlays,
      })),
    [stats]
  )

  const cityAgg = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of stats?.cityStatsByDate ?? []) {
      map.set(row.city, (map.get(row.city) ?? 0) + row.plays)
    }
    return [...map.entries()]
      .map(([city, plays]) => ({ city, plays }))
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 15)
  }, [stats])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <h1 className="text-2xl font-bold">Статистика</h1>
          <StatsSectionTabs active="publicka" />
        </div>
        <Button variant="outline" asChild>
          <Link href="/cabinet/publicka">Мои треки в Публичке</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-8 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : !stats || stats.placementsCount === 0 ? (
        <Card>
          <CardContent className="py-10 space-y-3 text-center">
            <p className="font-medium">Пока нет треков в Публичке</p>
            <p className="text-sm text-muted-foreground">
              Разместите музыку в фоновой трансляции БизнесЗвук - статистика и заработок появятся здесь.
            </p>
            <Button asChild>
              <Link href="/cabinet/publicka">Перейти в Публичку</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Прослушивания
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">
                {stats.totalPlays.toLocaleString("ru-RU")}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Заработано
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">
                {stats.earningsRub.toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ₽
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ставка
                </CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">
                {PUBLICKA_RATE_RUB.toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                })}{" "}
                ₽ / прослушивание
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Прослушивания по дням</CardTitle>
            </CardHeader>
            <CardContent>
              {dailyChart.length === 0 ? (
                <p className="text-sm text-muted-foreground">Нет данных за период</p>
              ) : (
                <ChartContainer config={chartConfig} className="h-[260px] w-full">
                  <AreaChart data={dailyChart}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="shortDate" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="plays"
                      stroke="var(--color-plays)"
                      fill="var(--color-plays)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Города</CardTitle>
              </CardHeader>
              <CardContent>
                {cityAgg.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Нет данных по городам</p>
                ) : (
                  <ChartContainer config={chartConfig} className="h-[260px] w-full">
                    <BarChart data={cityAgg} layout="vertical" margin={{ left: 24 }}>
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="city"
                        tickLine={false}
                        axisLine={false}
                        width={100}
                      />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="plays" fill="var(--color-plays)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Топ треков</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(stats.topTracks ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Пока нет прослушиваний</p>
                ) : (
                  stats.topTracks.map((t, i) => (
                    <div
                      key={`${t.title}-${t.artist}-${i}`}
                      className="flex items-center justify-between gap-3 text-sm border-b border-border/50 pb-2 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{t.title}</p>
                        <p className="text-muted-foreground truncate">{t.artist}</p>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <p>{t.plays.toLocaleString("ru-RU")}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.earningsRub.toLocaleString("ru-RU", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          ₽
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
