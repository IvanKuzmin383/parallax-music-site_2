"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Building2, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { Spinner } from "@/components/ui/spinner"
import {
  PUBLICKA_RATE_RUB,
  PUBLICKA_STATUS_LABELS,
  type PublickaPlacementView,
  type PublickaStatsResponse,
} from "@/lib/publicka-shared"
import { cn } from "@/lib/utils"

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  active: "bg-emerald-500/15 text-emerald-300",
  paused: "bg-zinc-500/15 text-zinc-300",
  rejected: "bg-red-500/15 text-red-300",
}

export default function CabinetPublickaPage() {
  const [placements, setPlacements] = useState<PublickaPlacementView[]>([])
  const [stats, setStats] = useState<PublickaStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [pRes, sRes] = await Promise.all([
          fetch("/api/cabinet/publicka/placements", { credentials: "include" }),
          fetch("/api/cabinet/publicka/stats", { credentials: "include" }),
        ])
        if (!cancelled) {
          if (pRes.ok) {
            const data = (await pRes.json()) as { placements?: PublickaPlacementView[] }
            setPlacements(data.placements ?? [])
          }
          if (sRes.ok) {
            setStats((await sRes.json()) as PublickaStatsResponse)
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const summary = useMemo(
    () => ({
      plays: stats?.totalPlays ?? 0,
      earnings: stats?.earningsRub ?? 0,
      count: placements.length,
    }),
    [stats, placements.length]
  )

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Публичка</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Фоновая музыка в сервисе БизнесЗвук. Ставка{" "}
            {PUBLICKA_RATE_RUB.toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ за
            прослушивание. Начисления попадают в роялти (Финансы).
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/cabinet/music-stats?tab=publicka">
            <BarChart3 className="h-4 w-4 mr-2" />
            Статистика
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Треков</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">
                {summary.count}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Прослушивания</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">
                {summary.plays.toLocaleString("ru-RU")}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Заработано</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-bold tabular-nums">
                {summary.earnings.toLocaleString("ru-RU", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                ₽
              </CardContent>
            </Card>
          </div>

          {placements.length === 0 ? (
            <EmptyState
              title="Треков в Публичке пока нет"
              description="После размещения менеджером трек появится здесь. Можно оформить заявку через Продвижение."
              icon={Building2}
              action={
                <Button asChild>
                  <Link href="/cabinet/promotion/business-music">Оставить заявку</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {placements.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-border bg-card/40 p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{p.title}</p>
                      <p className="text-sm text-muted-foreground truncate">{p.artist}</p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-2 py-0.5 text-xs font-medium",
                        STATUS_TONE[p.status] ?? STATUS_TONE.pending
                      )}
                    >
                      {PUBLICKA_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm tabular-nums">
                    <span className="text-muted-foreground">
                      {p.totalPlays.toLocaleString("ru-RU")} прослушиваний
                    </span>
                    <span className="font-medium">
                      {p.earningsRub.toLocaleString("ru-RU", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      ₽
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
