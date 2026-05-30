"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowLeft, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { CountryPlaysByDate, MusicPlatformKey, MusicStatsResponse } from "@/lib/music-stats-shared"
import { CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS } from "@/lib/music-stats-shared"
import {
  getRangeByPreset,
  getYesterdayIsoLocal,
  type MusicStatsPeriodPreset,
} from "@/lib/music-stats-period-presets"
import { MUSIC_PLATFORM_LABELS } from "@/lib/music-platform"
import type { Track } from "@/lib/tracks"

type ChartDailyPoint = { date: string; shortDate: string } & Record<MusicPlatformKey, number>

type AggregatedStats = {
  platformKey: "all" | MusicPlatformKey
  platformLabel: string
  exportedAt: string | null
  totalPlays: number
  daysCount: number
  dailyPoints: ChartDailyPoint[]
  topTracks: Array<{ title: string; author: string; plays: number }>
  countryStatsByDate: CountryPlaysByDate[]
}

type PeriodFilter = MusicStatsPeriodPreset

const PLATFORM_COLORS: Record<MusicPlatformKey, string> = {
  yandex_music: "#22c55e", // green
  itunes: "#3b82f6", // blue
  youtube_music: "#a855f7", // purple
  vk_ok_boom: "#f97316", // orange
  spotify: "#10b981", // emerald
  shazam: "#eab308", // yellow
  apple_music: "#ef4444", // red
  pandora: "#0f172a", // slate
  amazon: "#ff9900", // brand orange
}

const PLATFORM_KEYS = Object.keys(MUSIC_PLATFORM_LABELS) as MusicPlatformKey[]
const COUNTRY_COLORS = ["#3b82f6", "#10b981", "#f97316", "#a855f7", "#ef4444", "#06b6d4", "#eab308"]
/** Линии сравнения треков по дням (без привязки к платформам). */
const TRACK_DAILY_LINE_COLORS = COUNTRY_COLORS

function sumPlaysInPeriod(res: MusicStatsResponse, startIso: string, endIso: string): number {
  let sum = 0
  for (const d of res.dailyStats) {
    if (d.date >= startIso && d.date <= endIso) sum += d.totalPlays
  }
  return sum
}

/** Сумма прослушиваний трека за день по всем выбранным платформам. */
function sumTrackPlaysOnDate(
  platformRows: MusicStatsResponse[] | undefined,
  platformKeys: MusicPlatformKey[],
  dateIso: string,
): number {
  if (!platformRows?.length) return 0
  let sum = 0
  for (let j = 0; j < platformKeys.length; j++) {
    const res = platformRows[j]
    if (!res) continue
    const day = res.dailyStats.find((d) => d.date === dateIso)
    sum += day?.totalPlays ?? 0
  }
  return sum
}

function resolvePeriodRangeForCompare(
  chartPoints: ChartDailyPoint[],
  customStart: string,
  customEnd: string,
  fallbackResponses: MusicStatsResponse[][] | null,
): { startIso: string; endIso: string } | null {
  let minDate = chartPoints[0]?.date
  let maxDate = chartPoints[chartPoints.length - 1]?.date
  if (!minDate || !maxDate) {
    const dates = (fallbackResponses ?? [])
      .flat()
      .flatMap((r) => r.dailyStats.map((d) => d.date))
    if (!dates.length) return null
    dates.sort((a, b) => a.localeCompare(b))
    minDate = dates[0]!
    maxDate = dates[dates.length - 1]!
  }
  let startIso = customStart || minDate
  let endIso = customEnd || maxDate
  if (startIso > endIso) {
    const tmp = startIso
    startIso = endIso
    endIso = tmp
  }
  return { startIso, endIso }
}

function buildAllPlatformsChartStats(statsList: MusicStatsResponse[]): AggregatedStats {
  const byDate = new Map<string, Record<string, number>>()
  const byTrack = new Map<string, { title: string; author: string; plays: number }>()
  const byDateCountry = new Map<string, Map<string, number>>()
  let totalPlays = 0

  for (const stats of statsList) {
    totalPlays += stats.totalPlays
    for (const item of stats.dailyStats) {
      const prev = byDate.get(item.date) ?? {}
      prev[stats.platformKey] = item.totalPlays
      byDate.set(item.date, prev)
    }

    for (const row of stats.countryStatsByDate ?? []) {
      const day = byDateCountry.get(row.date) ?? new Map<string, number>()
      day.set(row.country, (day.get(row.country) ?? 0) + row.plays)
      byDateCountry.set(row.date, day)
    }

    for (const track of stats.topTracks) {
      const key = `${track.author}__${track.title}`.toLowerCase()
      const prevTrack = byTrack.get(key)
      if (prevTrack) prevTrack.plays += track.plays
      else byTrack.set(key, { title: track.title, author: track.author, plays: track.plays })
    }
  }

  const dates = [...byDate.keys()].sort((a, b) => a.localeCompare(b))
  const dailyPoints: ChartDailyPoint[] = dates.map((date) => {
    const base = byDate.get(date) ?? {}

    const platformValues = Object.fromEntries(
      PLATFORM_KEYS.map((k) => [k, Number(base[k] ?? 0)]),
    ) as Record<MusicPlatformKey, number>

    return {
      date,
      shortDate: format(new Date(date), "dd.MM", { locale: ru }),
      ...platformValues,
    }
  })
  const topTracks = [...byTrack.values()].sort((a, b) => b.plays - a.plays)

  const countryStatsByDate: CountryPlaysByDate[] = []
  for (const [date, m] of byDateCountry.entries()) {
    for (const [country, plays] of m.entries()) {
      countryStatsByDate.push({ date, country, plays })
    }
  }
  countryStatsByDate.sort((a, b) => a.date.localeCompare(b.date) || a.country.localeCompare(b.country))

  return {
    platformKey: "all",
    platformLabel: "Все платформы",
    exportedAt: null,
    totalPlays,
    daysCount: dailyPoints.length,
    dailyPoints,
    topTracks,
    countryStatsByDate,
  }
}

function buildSinglePlatformChartStats(res: MusicStatsResponse): AggregatedStats {
  const dailyPoints: ChartDailyPoint[] = res.dailyStats.map((item) => {
    const platformValues = Object.fromEntries(
      PLATFORM_KEYS.map((k) => [k, k === res.platformKey ? item.totalPlays : 0]),
    ) as Record<MusicPlatformKey, number>

    return {
      date: item.date,
      shortDate: format(new Date(item.date), "dd.MM", { locale: ru }),
      ...platformValues,
    }
  })

  return {
    platformKey: res.platformKey,
    platformLabel: res.platformLabel,
    exportedAt: res.exportedAt ?? null,
    totalPlays: res.totalPlays,
    daysCount: res.daysCount,
    dailyPoints,
    topTracks: [...res.topTracks].sort((a, b) => b.plays - a.plays),
    countryStatsByDate: res.countryStatsByDate ?? [],
  }
}

type CabinetMusicStatsBatchPayload = {
  chart: MusicStatsResponse[]
  compare: Array<{ trackId: string; platforms: MusicStatsResponse[] }>
}

async function fetchMusicStatsBatch(options: {
  platformKeys: MusicPlatformKey[]
  chartTrackIds: string[] | null
  compareTrackIds: string[]
}): Promise<CabinetMusicStatsBatchPayload> {
  const params = new URLSearchParams()
  params.set("platforms", options.platformKeys.join(","))
  if (options.chartTrackIds?.length) {
    for (const id of options.chartTrackIds) params.append("trackId", id)
  }
  for (const id of options.compareTrackIds) params.append("compareTrackId", id)

  const response = await fetch(`/api/cabinet/music-stats/batch?${params}`, {
    credentials: "include",
  })

  if (response.status === 401) {
    const err = new Error("Unauthorized")
    ;(err as { status?: number }).status = 401
    throw err
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error || "Не удалось загрузить статистику")
  }

  return (await response.json()) as CabinetMusicStatsBatchPayload
}

export default function CabinetMusicStatsPage() {
  const router = useRouter()

  const [selectedPlatformKeys, setSelectedPlatformKeys] = useState<MusicPlatformKey[]>(PLATFORM_KEYS)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month")
  const [customPeriodStart, setCustomPeriodStart] = useState<string>("")
  const [customPeriodEnd, setCustomPeriodEnd] = useState<string>("")

  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([])

  const [tracksMeta, setTracksMeta] = useState<Track[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState<AggregatedStats | null>(null)
  /** Индекс трека → ответы API по каждой выбранной платформе (в порядке platformKeysForChart). */
  const [perTrackPlatformResponses, setPerTrackPlatformResponses] = useState<MusicStatsResponse[][] | null>(null)
  const [compareLoading, setCompareLoading] = useState(false)

  const [topTracksVisibleCount, setTopTracksVisibleCount] = useState(10)
  const [streamsDiscrepancyInfoOpen, setStreamsDiscrepancyInfoOpen] = useState(false)

  const isAllPlatformsSelected = selectedPlatformKeys.length === PLATFORM_KEYS.length
  const platformKeysForChart = isAllPlatformsSelected ? PLATFORM_KEYS : selectedPlatformKeys

  /** До 5 треков для сравнения: выбранные в фильтре или первые из каталога (не весь каталог). */
  const trackIdsForCompareChart = useMemo(() => {
    const source =
      selectedTrackIds.length > 0 ? selectedTrackIds : tracksMeta.map((t) => t.id)
    return source.slice(0, CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS)
  }, [selectedTrackIds, tracksMeta])

  const compareTracksTruncated = useMemo(() => {
    if (selectedTrackIds.length > CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS) return true
    return selectedTrackIds.length === 0 && tracksMeta.length > CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS
  }, [selectedTrackIds.length, tracksMeta.length])

  const chartConfigDynamic = useMemo(() => {
    return Object.fromEntries(
      platformKeysForChart.map((k) => [k, { label: MUSIC_PLATFORM_LABELS[k], color: PLATFORM_COLORS[k] }]),
    ) as ChartConfig
  }, [platformKeysForChart])

  const chartData = useMemo(() => {
    return stats?.dailyPoints ?? []
  }, [stats])

  useEffect(() => {
    if (!chartData.length) return
    const minDate = chartData[0]!.date
    let endYmd = getYesterdayIsoLocal()
    if (endYmd < minDate) endYmd = minDate
    const { startIso, endIso } = getRangeByPreset(periodFilter, endYmd, minDate)
    setCustomPeriodStart(startIso)
    setCustomPeriodEnd(endIso)
  }, [chartData, periodFilter])

  const filteredChartData = useMemo(() => {
    if (!chartData.length) return []

    const minDate = chartData[0]!.date
    const maxDate = chartData[chartData.length - 1]!.date
    let startIso = customPeriodStart || minDate
    let endIso = customPeriodEnd || maxDate

    if (startIso > endIso) {
      const tmp = startIso
      startIso = endIso
      endIso = tmp
    }

    // Inclusive range; chartData uses ISO `YYYY-MM-DD` so lexicographic compare works.
    return chartData.filter((p) => p.date >= startIso && p.date <= endIso)
  }, [chartData, periodFilter, customPeriodStart, customPeriodEnd])

  const periodTotals = useMemo(() => {
    if (!filteredChartData.length) return { totalPlays: 0, daysCount: 0 }

    const totalPlays = filteredChartData.reduce((sum, p) => {
      return sum + platformKeysForChart.reduce((s, k) => s + p[k]!, 0)
    }, 0)

    return { totalPlays, daysCount: filteredChartData.length }
  }, [filteredChartData, platformKeysForChart])

  const pieConfig = useMemo(() => {
    return Object.fromEntries(
      platformKeysForChart.map((k) => [k, { label: MUSIC_PLATFORM_LABELS[k], color: PLATFORM_COLORS[k] }]),
    ) as ChartConfig
  }, [platformKeysForChart])

  const pieData = useMemo(() => {
    const total = platformKeysForChart.reduce((sum, k) => {
      return sum + filteredChartData.reduce((s, p) => s + p[k]!, 0)
    }, 0)

    return platformKeysForChart
      .map((k) => {
        const value = filteredChartData.reduce((sum, p) => sum + p[k]!, 0)
        const percent = total > 0 ? (value / total) * 100 : 0
        return { key: k, name: MUSIC_PLATFORM_LABELS[k], value, percent }
      })
      .sort((a, b) => b.value - a.value)
  }, [filteredChartData, platformKeysForChart])

  const trackCompareBarData = useMemo(() => {
    if (!perTrackPlatformResponses?.length || !trackIdsForCompareChart.length) return []

    const range = resolvePeriodRangeForCompare(
      chartData,
      customPeriodStart,
      customPeriodEnd,
      perTrackPlatformResponses,
    )
    if (!range) return []

    const { startIso, endIso } = range

    return trackIdsForCompareChart.map((trackId, i) => {
      const platformRows = perTrackPlatformResponses[i]
      if (!platformRows || platformRows.length !== platformKeysForChart.length) return null

      const meta = tracksMeta.find((x) => x.id === trackId)
      const fullLabel = meta ? meta.trackName : trackId
      const short =
        meta ?
          meta.trackName.length > 36 ?
            `${meta.trackName.slice(0, 33)}…`
          : meta.trackName
        : trackId

      const byPlatform = Object.fromEntries(
        platformKeysForChart.map((k, j) => [
          k,
          sumPlaysInPeriod(platformRows[j]!, startIso, endIso),
        ]),
      ) as Record<MusicPlatformKey, number>

      return {
        name: short,
        fullLabel,
        ...byPlatform,
      }
    }).filter((r): r is NonNullable<typeof r> => r !== null)
  }, [
    perTrackPlatformResponses,
    trackIdsForCompareChart,
    chartData,
    customPeriodStart,
    customPeriodEnd,
    platformKeysForChart,
    tracksMeta,
  ])

  const trackCompareLineChartConfig = useMemo(() => {
    return Object.fromEntries(
      trackIdsForCompareChart.map((trackId, i) => {
        const meta = tracksMeta.find((x) => x.id === trackId)
        const label = meta ? meta.trackName : trackId
        return [
          `t${i}`,
          {
            label,
            color: TRACK_DAILY_LINE_COLORS[i % TRACK_DAILY_LINE_COLORS.length],
          },
        ]
      }),
    ) as ChartConfig
  }, [trackIdsForCompareChart, tracksMeta])

  const trackDailyCompareChartData = useMemo(() => {
    if (!perTrackPlatformResponses?.length || !trackIdsForCompareChart.length) return []
    if (!filteredChartData.length) return []

    return filteredChartData.map((point) => {
      const row: Record<string, string | number> = {
        date: point.date,
        shortDate: point.shortDate,
      }
      trackIdsForCompareChart.forEach((_, i) => {
        const platformRows = perTrackPlatformResponses[i]
        row[`t${i}`] = sumTrackPlaysOnDate(platformRows, platformKeysForChart, point.date)
      })
      return row
    })
  }, [
    perTrackPlatformResponses,
    trackIdsForCompareChart,
    filteredChartData,
    platformKeysForChart,
  ])

  const { countryPieData, countryUnknownPlays, countryGeoTotalPlays } = useMemo(() => {
    type PieRow = { key: string; name: string; value: number; percent: number }
    const empty = {
      countryPieData: [] as PieRow[],
      countryUnknownPlays: 0,
      countryGeoTotalPlays: 0,
    }

    const rows = stats?.countryStatsByDate ?? []
    if (!rows.length || !chartData.length) {
      return empty
    }

    const minDate = chartData[0]!.date
    const maxDate = chartData[chartData.length - 1]!.date
    let startIso = customPeriodStart || minDate
    let endIso = customPeriodEnd || maxDate
    if (startIso > endIso) {
      const tmp = startIso
      startIso = endIso
      endIso = tmp
    }

    const byCountry = new Map<string, number>()
    let unknownPlays = 0
    let geoTotalPlays = 0

    for (const r of rows) {
      if (r.date < startIso || r.date > endIso) continue
      geoTotalPlays += r.plays
      if (r.country === "Unknown") {
        unknownPlays += r.plays
        continue
      }
      byCountry.set(r.country, (byCountry.get(r.country) ?? 0) + r.plays)
    }

    const totalKnown = [...byCountry.values()].reduce((a, b) => a + b, 0)
    if (totalKnown <= 0) {
      return {
        countryPieData: [] as PieRow[],
        countryUnknownPlays: unknownPlays,
        countryGeoTotalPlays: geoTotalPlays,
      }
    }

    const sorted = [...byCountry.entries()]
      .map(([name, value]) => ({
        key: name,
        name,
        value,
        percent: (value / totalKnown) * 100,
      }))
      .sort((a, b) => b.value - a.value)

    const topCountryCount = 6
    const top = sorted.slice(0, topCountryCount)
    const rest = sorted.slice(topCountryCount)
    const othersValue = rest.reduce((s, r) => s + r.value, 0)
    const countryPieData =
      rest.length > 0 && othersValue > 0
        ? [
            ...top,
            {
              key: "__country_others__",
              name: "Прочие",
              value: othersValue,
              percent: (othersValue / totalKnown) * 100,
            },
          ]
        : top

    return {
      countryPieData,
      countryUnknownPlays: unknownPlays,
      countryGeoTotalPlays: geoTotalPlays,
    }
  }, [stats?.countryStatsByDate, chartData, customPeriodStart, customPeriodEnd])

  const topTracksForTable = useMemo(() => stats?.topTracks ?? [], [stats])

  useEffect(() => {
    setTopTracksVisibleCount(10)
  }, [topTracksForTable])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setCompareLoading(true)
      setError(null)

      try {
        const chartTrackIds = selectedTrackIds.length > 0 ? selectedTrackIds : null
        const batch = await fetchMusicStatsBatch({
          platformKeys: platformKeysForChart,
          chartTrackIds,
          compareTrackIds: trackIdsForCompareChart,
        })

        if (cancelled) return

        setStats(buildAllPlatformsChartStats(batch.chart))
        setPerTrackPlatformResponses(
          trackIdsForCompareChart.length ?
            batch.compare.map((row) => row.platforms)
          : null,
        )
      } catch (e) {
        if (cancelled) return
        const message = e instanceof Error ? e.message : "Неизвестная ошибка загрузки"
        const status = (e as { status?: number }).status
        if (status === 401) {
          router.replace("/cabinet")
          return
        }
        setError(message)
        setStats(null)
        setPerTrackPlatformResponses(null)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setCompareLoading(false)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [platformKeysForChart, selectedTrackIds, trackIdsForCompareChart, router])

  useEffect(() => {
    const loadMeta = async () => {
      setLoadingMeta(true)
      try {
        const response = await fetch("/api/cabinet/tracks", { credentials: "include" })

        if (response.status === 401) {
          router.replace("/cabinet")
          return
        }

        if (!response.ok) {
          throw new Error("Не удалось загрузить справочники релизов/трека")
        }

        const data = (await response.json().catch(() => null)) as { tracks?: Track[] } | null
        setTracksMeta(data?.tracks ?? [])
      } catch {
        // Meta-select options are non-critical for charts; ignore errors.
      } finally {
        setLoadingMeta(false)
      }
    }

    void loadMeta()
  }, [router])

  const platformTriggerLabel = (() => {
    if (isAllPlatformsSelected) return "Все платформы"
    const labels = selectedPlatformKeys.map((k) => MUSIC_PLATFORM_LABELS[k] ?? k)
    const shown = labels.slice(0, 2).join(", ")
    const rest = labels.length - 2
    return rest > 0 ? `${shown} +${rest}` : shown
  })()

  const tracksForFilter = useMemo(() => {
    return [...tracksMeta].sort((a, b) => {
      const byName = a.trackName.localeCompare(b.trackName, "ru")
      if (byName !== 0) return byName
      return a.artistName.localeCompare(b.artistName, "ru")
    })
  }, [tracksMeta])

  const trackTriggerLabel = (() => {
    if (selectedTrackIds.length === 0) return "Все треки"
    if (selectedTrackIds.length === 1) {
      const t = tracksMeta.find((x) => x.id === selectedTrackIds[0])
      return t ? `${t.trackName} • ${t.artistName}` : "1 трек"
    }
    if (selectedTrackIds.length <= 2) {
      const labels = selectedTrackIds.map((id) => {
        const t = tracksMeta.find((x) => x.id === id)
        return t ? t.trackName : id
      })
      return labels.join(", ")
    }
    const shown = selectedTrackIds
      .slice(0, 2)
      .map((id) => tracksMeta.find((x) => x.id === id)?.trackName ?? id)
      .join(", ")
    return `${shown} +${selectedTrackIds.length - 2}`
  })()

  const togglePlatformKey = (key: MusicPlatformKey, checked: boolean) => {
    setSelectedPlatformKeys((prev) => {
      const has = prev.includes(key)
      let next = prev
      if (checked) {
        next = has ? prev : [...prev, key]
      } else {
        next = prev.filter((k) => k !== key)
      }
      if (next.length === 0) return PLATFORM_KEYS
      return next
    })
  }

  const setAllPlatformsChecked = (checked: boolean) => {
    setSelectedPlatformKeys(checked ? PLATFORM_KEYS : [PLATFORM_KEYS[0]!])
  }

  const toggleTrackFilter = (trackId: string, checked: boolean) => {
    setSelectedTrackIds((prev) => {
      if (checked) return prev.includes(trackId) ? prev : [...prev, trackId]
      return prev.filter((id) => id !== trackId)
    })
  }


  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="ghost" size="sm" className="-ml-2 mb-1" asChild>
              <Link href="/cabinet">
                <ArrowLeft className="h-4 w-4 mr-1" />
                В личный кабинет
              </Link>
            </Button>
            <h1 className="text-2xl font-bold">Статистика прослушиваний</h1>
            <p className="text-sm text-muted-foreground max-w-3xl mt-2">
              Почему количество стримов на площадках может отличаться от статистики, которая отражена в личном
              кабинете?{" "}
              <button
                type="button"
                onClick={() => setStreamsDiscrepancyInfoOpen(true)}
                className="text-primary underline-offset-4 hover:underline font-medium text-foreground"
              >
                Подробнее
              </button>
            </p>
          </div>
        </div>

        <Dialog open={streamsDiscrepancyInfoOpen} onOpenChange={setStreamsDiscrepancyInfoOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[min(90vh,800px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-left pr-8 leading-snug">
                Почему количество стримов на площадках может отличаться от статистики, которая отражена в личном
                кабинете?
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm text-muted-foreground">
              <p>
                У каждой стриминговой площадки счетчик прослушиваний работает по-разному, согласно той логике,
                которая задана непосредственно площадкой.
              </p>
              <p>
                Например, учитывает все прослушивания без исключения. То есть, если пользователь несколько раз подряд
                прослушал один и тот же трек, счетчик площадки в онлайн режиме фиксирует и отображает все эти
                воспроизведения. Даже в том случае, если трек стоит на репите.
              </p>
              <p>
                Но все подобные накрутки исключаются в ходе проверки, и дистрибьютору площадка направляет информацию
                только об уникальных «чистых» прокатах в сутки.
              </p>
              <p>
                В нашей статистике отражены только уникальные прослушивания. Она исключает:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>повторные прослушивания;</li>
                <li>искусственное увеличение прокатов;</li>
                <li>неполные прослушивания трека.</li>
              </ul>
              <p>
                Обращаем внимание, что данная статистика не является финансовым отчетом и не является основанием для
                расчета вознаграждения.
              </p>
              <p>
                Финансовый отчет отражает полученные роялти за прокаты, и формируется, исходя из следующих факторов:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>количество уникальных прокатов;</li>
                <li>ставка - стоимость проката на конкретной стриминговой платформе;</li>
                <li>наличие/отсутствие подписки;</li>
                <li>регион пользователя, который прослушал трек;</li>
              </ul>
            </div>
          </DialogContent>
        </Dialog>

        <Card>
          <CardContent>
            <div className="flex items-center gap-2 flex-wrap w-full">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-sm font-medium whitespace-nowrap">Период</span>

                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">с</span>
                  <Input
                    type="date"
                    value={customPeriodStart}
                    onChange={(e) => setCustomPeriodStart(e.target.value)}
                    className="h-8 w-[140px] px-2 py-0 text-sm"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">по</span>
                  <Input
                    type="date"
                    value={customPeriodEnd}
                    onChange={(e) => setCustomPeriodEnd(e.target.value)}
                    className="h-8 w-[140px] px-2 py-0 text-sm"
                  />
                </div>

                <Button
                  variant={periodFilter === "week" ? "default" : "outline"}
                  onClick={() => setPeriodFilter("week")}
                >
                  Неделя
                </Button>
                <Button
                  variant={periodFilter === "month" ? "default" : "outline"}
                  onClick={() => setPeriodFilter("month")}
                >
                  Месяц
                </Button>
                <Button
                  variant={periodFilter === "quarter" ? "default" : "outline"}
                  onClick={() => setPeriodFilter("quarter")}
                >
                  Квартал
                </Button>

              </div>

              {stats && !loading ? (
                <div className="ml-auto flex items-center gap-3">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Всего прослушиваний</span>
                  <span className="text-xl font-bold whitespace-nowrap">
                    {periodTotals.totalPlays.toLocaleString("ru-RU")}
                  </span>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div>
          <div className="flex flex-col gap-2 md:flex-row md:items-stretch md:gap-3">
            <div className="flex min-w-0 flex-1 items-stretch">
              <div className="shrink-0 w-full md:w-auto">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 w-full md:w-72 max-w-full justify-start rounded-md border transition-none transform-none hover:scale-100 active:scale-100"
                    >
                      {platformTriggerLabel}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-72">
                    <DropdownMenuCheckboxItem
                      checked={isAllPlatformsSelected}
                      onCheckedChange={(checked) => setAllPlatformsChecked(checked)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Все платформы
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {PLATFORM_KEYS.map((k) => (
                      <DropdownMenuCheckboxItem
                        key={k}
                        checked={selectedPlatformKeys.includes(k)}
                        onCheckedChange={(checked) => togglePlatformKey(k, checked)}
                        onSelect={(e) => e.preventDefault()}
                      >
                        {MUSIC_PLATFORM_LABELS[k]}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="min-w-0 w-full md:max-w-md md:shrink-0 lg:max-w-lg">
              <div className="relative">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      disabled={loadingMeta}
                      className="h-10 w-full justify-start rounded-md border pr-8 transition-none transform-none hover:scale-100 active:scale-100"
                    >
                      <span className="truncate">{trackTriggerLabel}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[min(100vw-2rem,28rem)] max-h-[min(320px,70vh)] overflow-y-auto">
                    <DropdownMenuCheckboxItem
                      checked={selectedTrackIds.length === 0}
                      onCheckedChange={(checked) => {
                        if (checked) setSelectedTrackIds([])
                      }}
                      onSelect={(e) => e.preventDefault()}
                    >
                      Все треки
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {tracksForFilter.map((t) => (
                      <DropdownMenuCheckboxItem
                        key={t.id}
                        checked={selectedTrackIds.length > 0 && selectedTrackIds.includes(t.id)}
                        onCheckedChange={(checked) => toggleTrackFilter(t.id, Boolean(checked))}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <span className="truncate">
                          {t.trackName} • {t.artistName}
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {selectedTrackIds.length > 0 ? (
                  <button
                    type="button"
                    aria-label="Сбросить фильтр треков"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedTrackIds([])}
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

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

        {loading ? (
          <div className="min-h-[320px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Загрузка данных...</p>
          </div>
        ) : null}

        {stats && !loading ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Прослушивания по дням</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfigDynamic} className="h-[320px] w-full">
                  <AreaChart data={filteredChartData} margin={{ left: 8, right: 8 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="shortDate"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={18}
                    />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null

                        const filteredPayload = payload.filter((item) => {
                          const n = Number(item.value)
                          return Number.isFinite(n) && n > 0
                        })

                        const dateValue = payload[0]?.payload?.date
                        const dateLabel =
                          dateValue ? format(new Date(String(dateValue)), "dd.MM.yyyy") : ""

                        if (!filteredPayload.length) {
                          return (
                            <div className="border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                              {dateLabel ? <div className="font-bold">{dateLabel}</div> : null}
                              <span className="text-muted-foreground">Нет прослушиваний за этот день</span>
                            </div>
                          )
                        }

                        return (
                          <ChartTooltipContent
                            active={active}
                            payload={filteredPayload}
                            label={label}
                            labelFormatter={() => dateLabel}
                            labelClassName="font-bold"
                            formatter={(value, name) => {
                              const key = name as MusicPlatformKey
                              const platformLabel = MUSIC_PLATFORM_LABELS[key] ?? String(name)
                              const color = PLATFORM_COLORS[key] ?? "#6b7280"
                              return (
                                <span className="inline-flex items-center gap-2">
                                  <span className="font-mono font-medium tabular-nums">
                                    {Number(value).toLocaleString("ru-RU")}
                                  </span>
                                  <span style={{ color }} className="font-medium">
                                    {platformLabel}
                                  </span>
                                </span>
                              )
                            }}
                          />
                        )
                      }}
                    />
                    {platformKeysForChart.map((k) => (
                      <Area
                        key={k}
                        type="monotone"
                        dataKey={k}
                        stroke={`var(--color-${k})`}
                        fill={`var(--color-${k})`}
                        fillOpacity={0.14}
                        strokeWidth={2}
                        isAnimationActive={false}
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="text-sm">Распределение по платформам</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center gap-3">
                  <ChartContainer config={pieConfig} className="h-[220px] w-full max-w-[320px]">
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            hideLabel
                            formatter={(value, name, _item, _index, payload) => {
                              const count =
                                typeof value === "number" ? value : Number(value)

                              const abs = Math.abs(count)
                              const mod100 = abs % 100
                              const mod10 = mod100 % 10

                              const noun =
                                mod100 > 10 && mod100 < 20
                                  ? "прослушиваний"
                                  : mod10 === 1
                                    ? "прослушивание"
                                    : mod10 >= 2 && mod10 <= 4
                                      ? "прослушивания"
                                      : "прослушиваний"

                              const itemPayload = (payload as any) ?? (null as any)
                              const percent =
                                typeof itemPayload?.percent === "number"
                                  ? itemPayload.percent
                                  : null

                              return (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">{name}</span>
                                  <span className="text-foreground font-mono font-medium tabular-nums">
                                    {count.toLocaleString("ru-RU")} {noun}
                                  </span>
                                  {percent !== null ? (
                                    <span className="text-muted-foreground">
                                      {percent.toFixed(1)}%
                                    </span>
                                  ) : null}
                                </div>
                              )
                            }}
                          />
                        }
                      />
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        stroke="transparent"
                      >
                        {pieData.map((d) => (
                          <Cell key={d.key} fill={PLATFORM_COLORS[d.key]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ChartContainer>
                  <div className="flex w-full flex-wrap justify-center gap-1.5">
                    {pieData.map((d) => (
                      <div
                        key={d.key}
                        className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs"
                      >
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: PLATFORM_COLORS[d.key] }}
                        />
                        <span className="max-w-[160px] truncate">{d.name}</span>
                        <span className="whitespace-nowrap font-medium">{d.percent.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="text-sm">Распределение по странам</CardTitle>
              </CardHeader>
              <CardContent>
                {countryPieData.length > 0 ? (
                  <div className="flex flex-col items-center gap-3">
                    <ChartContainer config={{}} className="h-[220px] w-full max-w-[320px]">
                      <PieChart>
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              hideLabel
                              formatter={(value, name, _item, _index, payload) => {
                                const count = typeof value === "number" ? value : Number(value)
                                const itemPayload = (payload as any) ?? (null as any)
                                const percent =
                                  typeof itemPayload?.percent === "number"
                                    ? itemPayload.percent
                                    : null

                                return (
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">{name}</span>
                                    <span className="text-foreground font-mono font-medium tabular-nums">
                                      {count.toLocaleString("ru-RU")}
                                    </span>
                                    {percent !== null ? (
                                      <span className="text-muted-foreground">{percent.toFixed(1)}%</span>
                                    ) : null}
                                  </div>
                                )
                              }}
                            />
                          }
                        />
                        <Pie
                          data={countryPieData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          stroke="transparent"
                        >
                          {countryPieData.map((d, i) => (
                            <Cell key={d.key} fill={COUNTRY_COLORS[i % COUNTRY_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="flex w-full flex-col items-center gap-2">
                      <div className="flex w-full flex-wrap justify-center gap-1.5">
                        {countryPieData.map((d, i) => (
                          <div
                            key={d.key}
                            className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs"
                          >
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: COUNTRY_COLORS[i % COUNTRY_COLORS.length] }}
                            />
                            <span className="max-w-[160px] truncate">{d.name}</span>
                            <span className="whitespace-nowrap font-medium">{d.percent.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                      {countryUnknownPlays > 0 ? (
                        <p className="w-full text-center text-xs text-muted-foreground">
                          Справочно: Unknown - {countryUnknownPlays.toLocaleString("ru-RU")} прослушиваний
                          {countryGeoTotalPlays > 0
                            ? ` (${((countryUnknownPlays / countryGeoTotalPlays) * 100).toFixed(1)}% от общего числа прослушиваний по странам за период)`
                            : null}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : countryUnknownPlays > 0 ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-[220px] w-full max-w-[320px] items-center justify-center rounded-md border text-center text-sm text-muted-foreground px-3">
                      В диаграмме только страны с известным кодом; прослушивания без страны (Unknown) - справочно
                      ниже.
                    </div>
                    <p className="w-full text-center text-xs text-muted-foreground">
                      Справочно: Unknown - {countryUnknownPlays.toLocaleString("ru-RU")} прослушиваний
                      {countryGeoTotalPlays > 0
                        ? ` (${((countryUnknownPlays / countryGeoTotalPlays) * 100).toFixed(1)}% от общего числа прослушиваний по странам за период)`
                        : null}
                    </p>
                  </div>
                ) : (
                  <div className="flex h-[220px] w-full items-center justify-center rounded-md border text-sm text-muted-foreground">
                    Нет данных по странам
                  </div>
                )}
              </CardContent>
            </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Сравнение треков по площадкам</CardTitle>
                {compareTracksTruncated ? (
                  <p className="text-xs text-muted-foreground">
                    Показано не более {CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS} треков. Выберите до{" "}
                    {CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS} в фильтре для другого набора.
                  </p>
                ) : null}
              </CardHeader>
              <CardContent>
                {!trackIdsForCompareChart.length && loadingMeta ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-md border text-sm text-muted-foreground">
                    Загрузка каталога треков…
                  </div>
                ) : !trackIdsForCompareChart.length ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
                    Нет треков в каталоге - добавьте релизы в кабинете.
                  </div>
                ) : compareLoading ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-md border text-sm text-muted-foreground">
                    Загрузка сравнения по трекам…
                  </div>
                ) : trackCompareBarData.length ? (
                  <div className="flex flex-col gap-3">
                    <div className="w-full overflow-x-auto">
                    <ChartContainer
                      config={chartConfigDynamic}
                      className="h-[min(420px,60vh)] w-full"
                      style={{
                        minWidth: `${Math.max(480, trackCompareBarData.length * 72)}px`,
                      }}
                    >
                      <BarChart
                        data={trackCompareBarData}
                        margin={{ left: 4, right: 4, top: 8, bottom: 4 }}
                      >
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="name"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          interval={0}
                          height={trackCompareBarData.length > 3 ? 80 : 56}
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={48} />
                        <ChartTooltip
                          cursor={{ fill: "hsl(var(--muted))", opacity: 0.25 }}
                          content={
                            <ChartTooltipContent
                              labelFormatter={(_, payload) => {
                                const pl = payload?.[0]?.payload as
                                  | { fullLabel?: string; name?: string }
                                  | undefined
                                return pl?.fullLabel ?? pl?.name ?? ""
                              }}
                              labelClassName="font-bold max-w-[min(100vw-2rem,24rem)] whitespace-normal"
                              formatter={(value, name) => {
                                const key = name as MusicPlatformKey
                                const platformLabel = MUSIC_PLATFORM_LABELS[key] ?? String(name)
                                const color = PLATFORM_COLORS[key] ?? "#6b7280"
                                return (
                                  <span className="inline-flex items-center gap-2">
                                    <span className="font-mono font-medium tabular-nums">
                                      {Number(value).toLocaleString("ru-RU")}
                                    </span>
                                    <span style={{ color }} className="font-medium">
                                      {platformLabel}
                                    </span>
                                  </span>
                                )
                              }}
                            />
                          }
                        />
                        {platformKeysForChart.map((k) => (
                          <Bar
                            key={k}
                            dataKey={k}
                            fill={`var(--color-${k})`}
                            radius={[4, 4, 0, 0]}
                            maxBarSize={48}
                            isAnimationActive={false}
                          />
                        ))}
                      </BarChart>
                    </ChartContainer>
                    </div>
                    <div className="flex w-full flex-wrap justify-center gap-1.5">
                      {platformKeysForChart.map((k) => (
                        <div
                          key={k}
                          className="inline-flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1 text-xs"
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: PLATFORM_COLORS[k] }}
                          />
                          <span className="max-w-[160px] truncate">{MUSIC_PLATFORM_LABELS[k]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[200px] items-center justify-center rounded-md border text-sm text-muted-foreground">
                    Нет данных для сравнения за выбранный период.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Сравнение треков по дням</CardTitle>
                {compareTracksTruncated ? (
                  <p className="text-xs text-muted-foreground">
                    Показано не более {CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS} треков. Выберите до{" "}
                    {CABINET_MUSIC_STATS_COMPARE_MAX_TRACKS} в фильтре для другого набора.
                  </p>
                ) : null}
              </CardHeader>
              <CardContent>
                {!trackIdsForCompareChart.length && loadingMeta ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-md border text-sm text-muted-foreground">
                    Загрузка каталога треков…
                  </div>
                ) : !trackIdsForCompareChart.length ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-md border border-dashed px-4 text-center text-sm text-muted-foreground">
                    Нет треков в каталоге - добавьте релизы в кабинете.
                  </div>
                ) : compareLoading ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-md border text-sm text-muted-foreground">
                    Загрузка сравнения по трекам…
                  </div>
                ) : trackDailyCompareChartData.length ? (
                  <ChartContainer config={trackCompareLineChartConfig} className="h-[320px] w-full">
                    <LineChart data={trackDailyCompareChartData} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="shortDate"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={18}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip
                        cursor={false}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null

                          const filteredPayload = payload.filter((item) => {
                            const n = Number(item.value)
                            return Number.isFinite(n) && n > 0
                          })

                          const dateValue = payload[0]?.payload?.date
                          const dateLabel =
                            dateValue ? format(new Date(String(dateValue)), "dd.MM.yyyy") : ""

                          if (!filteredPayload.length) {
                            return (
                              <div className="border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
                                {dateLabel ? <div className="font-bold">{dateLabel}</div> : null}
                                <span className="text-muted-foreground">Нет прослушиваний за этот день</span>
                              </div>
                            )
                          }

                          return (
                            <ChartTooltipContent
                              active={active}
                              payload={filteredPayload}
                              labelFormatter={() => dateLabel}
                              labelClassName="font-bold"
                              formatter={(value, name) => {
                                const idx = Number(String(name).replace(/^t/, ""))
                                const color =
                                  TRACK_DAILY_LINE_COLORS[idx % TRACK_DAILY_LINE_COLORS.length]
                                const trackLabel =
                                  trackCompareLineChartConfig[String(name)]?.label ?? String(name)
                                return (
                                  <span className="inline-flex items-center gap-2">
                                    <span className="font-mono font-medium tabular-nums">
                                      {Number(value).toLocaleString("ru-RU")}
                                    </span>
                                    <span style={{ color }} className="font-medium">
                                      {trackLabel}
                                    </span>
                                  </span>
                                )
                              }}
                            />
                          )
                        }}
                      />
                      {trackIdsForCompareChart.map((_, i) => (
                        <Line
                          key={`t${i}`}
                          type="monotone"
                          dataKey={`t${i}`}
                          stroke={`var(--color-t${i})`}
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      ))}
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex min-h-[200px] items-center justify-center rounded-md border text-sm text-muted-foreground">
                    Нет данных за выбранный период.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Топ по трекам</CardTitle>
              </CardHeader>
              <CardContent>
                {topTracksForTable.length ? (
                  <div className="space-y-3">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-2 w-12">#</th>
                            <th className="text-left py-2 pr-2">Трек</th>
                            <th className="text-left py-2 pr-2">Автор</th>
                            <th className="text-right py-2">Прослушивания</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topTracksForTable.slice(0, topTracksVisibleCount).map((t, i) => (
                            <tr key={`${t.author}-${t.title}-${i}`} className="border-b last:border-b-0">
                              <td className="py-2 pr-2 text-muted-foreground">{i + 1}</td>
                              <td className="py-2 pr-2">{t.title}</td>
                              <td className="py-2 pr-2 text-muted-foreground">{t.author}</td>
                              <td className="py-2 text-right font-mono tabular-nums">
                                {t.plays.toLocaleString("ru-RU")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {topTracksVisibleCount < topTracksForTable.length ? (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() => setTopTracksVisibleCount((prev) => prev + 10)}
                        >
                          Еще
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет данных для рейтинга треков</p>
                )}
              </CardContent>
            </Card>

          </>
        ) : null}
      </div>
    </div>
  )
}

