"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns"
import { ru } from "date-fns/locale"
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Disc3,
  MoreVertical,
  Music,
  Banknote,
  Wallet,
} from "lucide-react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import type { ReleaseView } from "@/lib/cabinet/types"
import {
  releaseContinueHref,
  releaseContinueLabel,
  releaseStatusHint,
} from "@/lib/cabinet/adapters/map-track-to-release"
import {
  daysUntilRelease,
  releaseDetailHref,
} from "@/lib/cabinet/release-presenters"
import type { MusicStatsResponse } from "@/lib/music-stats-shared"
import { cn } from "@/lib/utils"

function formatRub(amount: number): string {
  const n = Math.abs(amount) % 100
  const last = n % 10
  let word = "рублей"
  if (n < 10 || n > 20) {
    if (last === 1) word = "рубль"
    else if (last >= 2 && last <= 4) word = "рубля"
  }
  return `${amount.toLocaleString("ru-RU")} ${word}`
}

function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return "дней"
  if (last === 1) return "день"
  if (last >= 2 && last <= 4) return "дня"
  return "дней"
}

function kindShort(release: ReleaseView): string {
  return release.format === "album" ? "Альбом" : "Сингл"
}

function usesWizardAction(release: ReleaseView): boolean {
  return (
    release.kind === "draft" ||
    release.releaseStatus === "upload_pending" ||
    release.releaseStatus === "rejected" ||
    release.releaseStatus === "awaiting_payment" ||
    release.status.includes("доработ") ||
    release.status.includes("оплат") ||
    release.status === "Черновик"
  )
}

function taskHref(release: ReleaseView): string {
  return usesWizardAction(release) ? releaseContinueHref(release) : releaseDetailHref(release)
}

function taskActionLabel(release: ReleaseView): string {
  const label = releaseContinueLabel(release)
  if (label === "Исправить") return "Доработать"
  return label
}

function isDashboardTask(release: ReleaseView): boolean {
  return (
    release.kind === "draft" ||
    release.releaseStatus === "upload_pending" ||
    release.releaseStatus === "awaiting_payment" ||
    release.releaseStatus === "rejected" ||
    release.status.includes("доработ") ||
    release.status.includes("Ожидает оплаты") ||
    release.status === "Черновик"
  )
}

export function DashboardMetricCards({
  releasesCount,
  balance,
  royalty,
}: {
  releasesCount: number
  balance: number
  royalty: number
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Link
        href="/cabinet/music/releases"
        className="group flex items-center justify-between gap-4 rounded-2xl bg-card/80 px-5 py-4 transition-colors hover:bg-card"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
            <Disc3 className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Релизы</p>
            <p className="text-2xl font-semibold tabular-nums leading-tight">{releasesCount}</p>
          </div>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary transition-colors">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </Link>

      <Link
        href="/cabinet/finance/balance"
        className="group flex items-center justify-between gap-4 rounded-2xl bg-card/80 px-5 py-4 transition-colors hover:bg-card"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
            <Wallet className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Баланс</p>
            <p className="text-2xl font-semibold tabular-nums leading-tight text-emerald-400">
              {formatRub(balance)}
            </p>
          </div>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary transition-colors">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </Link>

      <Link
        href="/cabinet/finance/royalty-withdrawal"
        className="group flex items-center justify-between gap-4 rounded-2xl bg-card/80 px-5 py-4 transition-colors hover:bg-card sm:col-span-2 lg:col-span-1"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
            <Banknote className="h-5 w-5 text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Роялти</p>
            <p className="text-2xl font-semibold tabular-nums leading-tight text-amber-400">
              {formatRub(royalty)}
            </p>
          </div>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary transition-colors">
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </Link>
    </div>
  )
}

type PeriodKey = 7 | 30 | 90

const chartConfig = {
  plays: { label: "Прослушивания", color: "var(--primary)" },
} satisfies ChartConfig

export function DashboardStatsPanel() {
  const [period, setPeriod] = useState<PeriodKey>(7)
  const [loading, setLoading] = useState(true)
  const [series, setSeries] = useState<Array<{ date: string; label: string; plays: number }>>([])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/cabinet/music-stats/batch?platforms=", {
          credentials: "include",
        })
        if (!res.ok) {
          if (!cancelled) setSeries([])
          return
        }
        const data = (await res.json()) as { chart?: MusicStatsResponse[] }
        const byDate = new Map<string, number>()
        for (const platform of data.chart ?? []) {
          for (const day of platform.dailyStats ?? []) {
            byDate.set(day.date, (byDate.get(day.date) ?? 0) + (day.totalPlays || 0))
          }
        }
        if (!cancelled) {
          const end = subDays(new Date(), 1)
          const start = subDays(end, 89)
          const all: Array<{ date: string; label: string; plays: number }> = []
          for (let d = start; d <= end; d = addDays(d, 1)) {
            const iso = format(d, "yyyy-MM-dd")
            all.push({
              date: iso,
              label: format(d, "EEE", { locale: ru }),
              plays: byDate.get(iso) ?? 0,
            })
          }
          setSeries(all)
        }
      } catch {
        if (!cancelled) setSeries([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const chartData = useMemo(() => {
    const slice = series.slice(-period)
    if (period === 7) {
      return slice.map((p) => ({
        ...p,
        label: format(parseISO(p.date), "EEEEEE", { locale: ru }),
      }))
    }
    return slice.map((p, i) => ({
      ...p,
      label:
        period === 30
          ? i % 5 === 0
            ? format(parseISO(p.date), "d MMM", { locale: ru })
            : ""
          : i % 14 === 0
            ? format(parseISO(p.date), "d MMM", { locale: ru })
            : "",
    }))
  }, [series, period])

  const periods: Array<{ key: PeriodKey; label: string }> = [
    { key: 7, label: "7 дней" },
    { key: 30, label: "30 дней" },
    { key: 90, label: "90 дней" },
  ]

  return (
    <section className="flex h-full flex-col rounded-2xl bg-card/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Статистика</h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Прослушивания
            </span>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/cabinet/music-stats">
            Перейти к статистике
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 flex gap-1 border-b border-border/60">
        {periods.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPeriod(p.key)}
            className={cn(
              "px-3 py-2 text-sm transition-colors",
              period === p.key
                ? "border-b-2 border-primary text-foreground font-medium -mb-px"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1 min-h-[220px]">
        {loading ? (
          <div className="flex h-[220px] items-center justify-center">
            <Spinner className="h-6 w-6" />
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[220px] w-full aspect-auto">
            <AreaChart data={chartData} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="dashPlaysFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-plays)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-plays)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
              />
              <YAxis
                domain={[0, "auto"]}
                width={40}
                tickLine={false}
                axisLine={false}
                tickMargin={6}
                allowDecimals={false}
                tickFormatter={(v: number) => {
                  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`
                  if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
                  return String(v)
                }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="plays"
                stroke="var(--color-plays)"
                fill="url(#dashPlaysFill)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </div>
    </section>
  )
}

export function DashboardNextRelease({ release }: { release: ReleaseView | null }) {
  const days = release ? daysUntilRelease(release.releaseDate) : null
  const href = release
    ? usesWizardAction(release)
      ? releaseContinueHref(release)
      : releaseDetailHref(release)
    : "/cabinet/upload"

  return (
    <section className="flex h-full flex-col rounded-2xl bg-card/80 p-5">
      <h2 className="text-lg font-semibold">Ближайший релиз</h2>
      {!release ? (
        <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-4 rounded-xl bg-muted/20 p-6 text-center">
          <Music className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Нет запланированных релизов</p>
          <Button asChild>
            <Link href="/cabinet/upload">Загрузить релиз</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-1 flex-col gap-4">
          <div className="relative mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-xl bg-muted">
            {release.coverUrl ? (
              <Image
                src={release.coverUrl}
                alt=""
                fill
                className="object-cover"
                unoptimized
                sizes="220px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-lg font-semibold truncate">{release.title || "Без названия"}</p>
            <p className="text-sm text-muted-foreground">
              {days == null
                ? "Дата выхода не указана"
                : days === 0
                  ? "Релиз выходит сегодня"
                  : `Релиз выйдет через ${days} ${pluralDays(days)}`}
            </p>
          </div>
          <Button asChild className="mt-auto w-full sm:w-auto sm:self-start">
            <Link href={href}>Открыть</Link>
          </Button>
        </div>
      )}
    </section>
  )
}

export function DashboardTasks({ releases }: { releases: ReleaseView[] }) {
  const tasks = releases.filter(isDashboardTask).slice(0, 5)

  return (
    <section className="flex h-full flex-col rounded-2xl bg-card/80 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Задачи</h2>
        <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
          <Link href="/cabinet/music/releases">
            Все задачи
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">Нет задач — всё в порядке</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {tasks.map((release) => {
            const href = taskHref(release)
            const action = taskActionLabel(release)
            const primary = action === "Оплатить" || action === "Доработать" || action === "Продолжить"
            return (
              <li
                key={release.id}
                className="flex flex-col gap-3 rounded-xl bg-muted/20 p-3 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                <Link
                  href={href}
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted"
                >
                  {release.coverUrl ? (
                    <Image
                      src={release.coverUrl}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                      sizes="48px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                </Link>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Link href={href} className="font-medium truncate hover:underline">
                      {release.title || "Без названия"}
                    </Link>
                    <span className="text-xs text-muted-foreground">{kindShort(release)}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={release.status} kind="generic" withIcon className="text-[10px]" />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {releaseStatusHint(release)}
                  </p>
                </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                  <Button asChild size="sm" variant={primary ? "default" : "secondary"}>
                    <Link href={href}>{action}</Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Меню</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={href}>{action}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={releaseDetailHref(release)}>Открыть релиз</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export function DashboardReleaseCalendar({ releases }: { releases: ReleaseView[] }) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const byDate = useMemo(() => {
    const map = new Map<string, ReleaseView[]>()
    for (const r of releases) {
      if (!r.releaseDate?.trim()) continue
      try {
        const key = format(parseISO(r.releaseDate), "yyyy-MM-dd")
        const list = map.get(key) ?? []
        list.push(r)
        map.set(key, list)
      } catch {
        /* skip */
      }
    }
    return map
  }, [releases])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 })
    const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 })
    return eachDayOfInterval({ start, end })
  }, [month])

  const weekdays = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"]

  return (
    <section className="flex h-full flex-col rounded-2xl bg-card/80 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Релизный календарь</h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setMonth((m) => startOfMonth(addMonths(m, -1)))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="min-w-[7.5rem] text-center text-sm font-medium capitalize">
            {format(month, "LLLL yyyy", { locale: ru })}
          </p>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setMonth((m) => startOfMonth(addMonths(m, 1)))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
        {weekdays.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd")
          const items = byDate.get(key) ?? []
          const inMonth = isSameMonth(day, month)
          const today = isSameDay(day, new Date())
          const cover = items[0]?.coverUrl
          const href = items[0]
            ? usesWizardAction(items[0])
              ? releaseContinueHref(items[0])
              : releaseDetailHref(items[0])
            : null

          const cell = (
            <div
              className={cn(
                "relative flex aspect-square flex-col items-center justify-start rounded-lg p-1 text-xs",
                inMonth ? "bg-muted/15" : "opacity-35",
                today && "ring-1 ring-primary/50",
                items.length > 0 && "bg-muted/30"
              )}
            >
              <span
                className={cn(
                  "tabular-nums",
                  today ? "font-semibold text-primary" : "text-muted-foreground"
                )}
              >
                {format(day, "d")}
              </span>
              {cover ? (
                <span className="relative mt-0.5 h-6 w-6 overflow-hidden rounded-full ring-1 ring-border">
                  <Image src={cover} alt="" fill className="object-cover" unoptimized sizes="24px" />
                </span>
              ) : items.length > 0 ? (
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary/20">
                  <Music className="h-3 w-3 text-primary" />
                </span>
              ) : null}
              {items.length > 1 ? (
                <span className="absolute bottom-0.5 right-0.5 text-[9px] text-muted-foreground">
                  +{items.length - 1}
                </span>
              ) : null}
            </div>
          )

          return href ? (
            <Link key={key} href={href} className="block hover:opacity-90">
              {cell}
            </Link>
          ) : (
            <div key={key}>{cell}</div>
          )
        })}
      </div>
    </section>
  )
}
