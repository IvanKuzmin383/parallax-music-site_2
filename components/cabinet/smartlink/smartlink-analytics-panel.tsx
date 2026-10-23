"use client"

import { useCallback, useEffect, useState } from "react"
import { BarChart3, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SmartlinkAnalyticsReport } from "@/lib/smartlink-analytics"
import { SMARTLINK_PLATFORMS } from "@/lib/smartlink-platforms"
import { SMARTLINK_SOCIALS } from "@/lib/smartlink-socials"
import { cn } from "@/lib/utils"

type PeriodKey = "7" | "30" | "90"

const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: "7", label: "7 дней", days: 7 },
  { key: "30", label: "30 дней", days: 30 },
  { key: "90", label: "90 дней", days: 90 },
]

const DEVICE_LABEL: Record<string, string> = {
  mobile: "Мобильные",
  tablet: "Планшеты",
  desktop: "Десктоп",
  unknown: "Неизвестно",
}

const OS_LABEL: Record<string, string> = {
  windows: "Windows",
  macos: "macOS",
  ios: "iOS",
  android: "Android",
  linux: "Linux",
  other: "Другое",
  unknown: "Неизвестно",
}

const BROWSER_LABEL: Record<string, string> = {
  chrome: "Chrome",
  safari: "Safari",
  firefox: "Firefox",
  edge: "Edge",
  opera: "Opera",
  other: "Другое",
  unknown: "Неизвестно",
}

function platformLabel(key: string): string {
  if (key.startsWith("social:")) {
    const net = key.slice("social:".length)
    return SMARTLINK_SOCIALS.find((s) => s.key === net)?.label ?? net
  }
  if (key.startsWith("extra:")) return "Доп. ссылка"
  return SMARTLINK_PLATFORMS.find((p) => p.key === key)?.label ?? key
}

function rangeFor(days: number): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000)
  return { from: from.toISOString(), to: to.toISOString() }
}

function BarList({
  items,
  empty,
}: {
  items: { label: string; value: number }[]
  empty: string
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>
  }
  const max = Math.max(...items.map((i) => i.value), 1)
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="truncate">{item.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{item.value}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground/70"
              style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Sparkline({ daily }: { daily: SmartlinkAnalyticsReport["daily"] }) {
  if (daily.length === 0) return null
  const max = Math.max(...daily.map((d) => Math.max(d.views, d.clicks)), 1)
  return (
    <div className="flex h-16 items-end gap-0.5">
      {daily.map((d) => (
        <div
          key={d.date}
          className="flex min-w-0 flex-1 flex-col justify-end gap-0.5"
          title={`${d.date}: ${d.views} / ${d.clicks}`}
        >
          <div
            className="w-full rounded-sm bg-foreground/25"
            style={{ height: `${Math.max(2, (d.clicks / max) * 100)}%` }}
          />
          <div
            className="w-full rounded-sm bg-foreground/70"
            style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }}
          />
        </div>
      ))}
    </div>
  )
}

function HourBars({ hours }: { hours: SmartlinkAnalyticsReport["hours"] }) {
  const max = Math.max(...hours.map((h) => h.views), 1)
  return (
    <div className="flex h-14 items-end gap-px">
      {hours.map((h) => (
        <div
          key={h.hour}
          className="min-w-0 flex-1 rounded-sm bg-foreground/65"
          style={{ height: `${Math.max(2, (h.views / max) * 100)}%` }}
          title={`${String(h.hour).padStart(2, "0")}:00 UTC - ${h.views} просм.`}
        />
      ))}
    </div>
  )
}

type SmartlinkAnalyticsPanelProps = {
  apiPath: string
  /** Обычно apiPath + "/export" */
  exportPath?: string
  className?: string
}

export function SmartlinkAnalyticsPanel({
  apiPath,
  exportPath,
  className,
}: SmartlinkAnalyticsPanelProps) {
  const [period, setPeriod] = useState<PeriodKey>("30")
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<SmartlinkAnalyticsReport | null>(null)

  const load = useCallback(
    async (days: number) => {
      setLoading(true)
      setError(null)
      try {
        const { from, to } = rangeFor(days)
        const res = await fetch(
          `${apiPath}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          { credentials: "include" },
        )
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          throw new Error(body?.error || "Не удалось загрузить статистику")
        }
        const data = (await res.json()) as SmartlinkAnalyticsReport
        setReport(data)
      } catch (e) {
        setReport(null)
        setError(e instanceof Error ? e.message : "Ошибка загрузки")
      } finally {
        setLoading(false)
      }
    },
    [apiPath],
  )

  useEffect(() => {
    const days = PERIODS.find((p) => p.key === period)?.days ?? 30
    void load(days)
  }, [period, load])

  const onExport = async () => {
    if (!exportPath) return
    setExporting(true)
    try {
      const days = PERIODS.find((p) => p.key === period)?.days ?? 30
      const { from, to } = rangeFor(days)
      const res = await fetch(
        `${exportPath}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { credentials: "include" },
      )
      if (!res.ok) throw new Error("Не удалось скачать CSV")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `smartlink-events-${period}d.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Не удалось скачать CSV")
    } finally {
      setExporting(false)
    }
  }

  const totals = report?.totals
  const hasDeep =
    (report?.countries?.length ?? 0) > 0 ||
    (report?.os?.length ?? 0) > 0 ||
    (report?.campaigns?.length ?? 0) > 0

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4" />
          Статистика
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.key}
              type="button"
              size="sm"
              variant={period === p.key ? "default" : "outline"}
              className="h-7 px-2.5 text-xs"
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </Button>
          ))}
          {exportPath ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2.5 text-xs"
              disabled={exporting || loading}
              onClick={() => void onExport()}
            >
              {exporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              CSV
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Загрузка...
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !totals || (totals.views === 0 && totals.clicks === 0) ? (
        <p className="text-sm text-muted-foreground">
          Пока нет данных. Статистика появится после переходов по публичной ссылке.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                { label: "Просмотры", value: totals.views },
                { label: "Уники", value: totals.uniqueVisitors },
                { label: "Клики", value: totals.clicks },
                { label: "CTR", value: `${totals.ctr}%` },
              ] as const
            ).map((kpi) => (
              <div key={kpi.label} className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-semibold tabular-nums">{kpi.value}</p>
              </div>
            ))}
          </div>

          {totals.audioUnlocks > 0 ? (
            <p className="text-xs text-muted-foreground">
              Разблокировок аудио: {totals.audioUnlocks}
            </p>
          ) : null}

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">По дням (тёмные - просмотры, светлые - клики)</p>
            <Sparkline daily={report?.daily ?? []} />
          </div>

          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">По часам UTC</p>
            <HourBars hours={report?.hours ?? []} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Площадки</p>
              <BarList
                items={(report?.platforms ?? []).map((p) => ({
                  label: platformLabel(p.key),
                  value: p.clicks,
                }))}
                empty="Кликов по площадкам нет"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Источники</p>
              <BarList
                items={(report?.sources ?? []).map((s) => ({
                  label: s.source,
                  value: s.views,
                }))}
                empty="Источников пока нет"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Устройства</p>
              <BarList
                items={(report?.devices ?? []).map((d) => ({
                  label: DEVICE_LABEL[d.device] ?? d.device,
                  value: d.views,
                }))}
                empty="Нет данных"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Страны</p>
              <BarList
                items={(report?.countries ?? [])
                  .filter((c) => c.country !== "??")
                  .map((c) => ({ label: c.country, value: c.views }))}
                empty="Страны появятся, если CDN отдаёт geo-заголовок"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">ОС</p>
              <BarList
                items={(report?.os ?? []).map((o) => ({
                  label: OS_LABEL[o.os] ?? o.os,
                  value: o.views,
                }))}
                empty="Нет данных"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Браузеры</p>
              <BarList
                items={(report?.browsers ?? []).map((b) => ({
                  label: BROWSER_LABEL[b.browser] ?? b.browser,
                  value: b.views,
                }))}
                empty="Нет данных"
              />
            </div>
          </div>

          {(report?.cities?.length ?? 0) > 0 || (report?.campaigns?.length ?? 0) > 0 || hasDeep ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {(report?.cities?.length ?? 0) > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Города</p>
                  <BarList
                    items={(report?.cities ?? []).map((c) => ({
                      label: c.country ? `${c.city} (${c.country})` : c.city,
                      value: c.views,
                    }))}
                    empty="Нет данных"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <p className="text-sm font-medium">UTM-кампании</p>
                <BarList
                  items={(report?.campaigns ?? []).map((c) => ({
                    label: c.campaign,
                    value: c.views,
                  }))}
                  empty="Добавьте utm_campaign в ссылку на смартлинк"
                />
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
