"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Area, AreaChart, CartesianGrid, Pie, PieChart, XAxis, YAxis, Cell } from "recharts"
import { X } from "lucide-react"
import { AdminSectionNav } from "@/components/admin-section-nav"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { CountryPlaysByDate, MusicPlatformKey, MusicStatsResponse, TopTrack } from "@/lib/music-stats-shared"
import { ADMIN_TOP_TRACKS_PAGE_SIZE } from "@/lib/music-stats-shared"
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

type ImportResult = {
  fileName: string
  platformKey?: string
  ok: boolean
  error?: string
  daysCount?: number
  totalPlays?: number
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

function buildAllPlatformsChartStats(statsList: MusicStatsResponse[]): AggregatedStats {
  const byDate = new Map<string, Record<string, number>>()
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
    topTracks: [],
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

async function importFilesToDb(files: File[]): Promise<{ ok: boolean; results: ImportResult[] }> {
  const formData = new FormData()
  for (const f of files) formData.append("files", f)

  const response = await fetch("/api/admin/music-stats/import", {
    method: "POST",
    credentials: "include",
    body: formData,
  })

  const data = (await response.json().catch(() => null)) as { ok?: boolean; results?: ImportResult[] } | null

  if (!response.ok) {
    return {
      ok: false,
      results: data?.results ?? [{ fileName: "unknown", ok: false, error: data?.results?.[0]?.error }],
    }
  }

  return {
    ok: data?.ok ?? true,
    results: data?.results ?? [],
  }
}

async function fetchPlatformStats(
  platformKey: MusicPlatformKey,
  options?: { artist?: string | null; albumId?: string | null; trackId?: string | null },
): Promise<MusicStatsResponse> {
  const artistParam = options?.artist?.trim() ? `&artist=${encodeURIComponent(options.artist.trim())}` : ""
  const albumIdParam = options?.albumId?.trim() ? `&albumId=${encodeURIComponent(options.albumId.trim())}` : ""
  const trackIdParam = options?.trackId?.trim() ? `&trackId=${encodeURIComponent(options.trackId.trim())}` : ""
  const response = await fetch(
    `/api/admin/music-stats?platform=${encodeURIComponent(platformKey)}${artistParam}${albumIdParam}${trackIdParam}`,
    {
    credentials: "include",
    },
  )

  if (response.status === 401) {
    const err = new Error("Unauthorized")
    ;(err as any).status = 401
    throw err
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error || "Не удалось загрузить статистику")
  }

  return (await response.json()) as MusicStatsResponse
}

async function fetchTopTracksPage(
  platformKeys: MusicPlatformKey[],
  offset: number,
  options?: { artist?: string | null; albumId?: string | null; trackId?: string | null },
): Promise<{ tracks: TopTrack[]; hasMore: boolean }> {
  const params = new URLSearchParams()
  params.set("platforms", platformKeys.join(","))
  params.set("offset", String(offset))
  params.set("limit", String(ADMIN_TOP_TRACKS_PAGE_SIZE))
  if (options?.artist?.trim()) params.set("artist", options.artist.trim())
  if (options?.albumId?.trim()) params.set("albumId", options.albumId.trim())
  if (options?.trackId?.trim()) params.set("trackId", options.trackId.trim())

  const response = await fetch(`/api/admin/music-stats/top-tracks?${params.toString()}`, {
    credentials: "include",
  })

  if (response.status === 401) {
    const err = new Error("Unauthorized")
    ;(err as Error & { status?: number }).status = 401
    throw err
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error || "Не удалось загрузить топ треков")
  }

  return (await response.json()) as { tracks: TopTrack[]; hasMore: boolean }
}

export default function MusicStatsPage() {
  const router = useRouter()

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedPlatformKeys, setSelectedPlatformKeys] = useState<MusicPlatformKey[]>(PLATFORM_KEYS)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("month")
  const [customPeriodStart, setCustomPeriodStart] = useState<string>("")
  const [customPeriodEnd, setCustomPeriodEnd] = useState<string>("")
  const [artistDraft, setArtistDraft] = useState("")
  const [artistFilter, setArtistFilter] = useState<string | null>(null)
  const [artistSuggestions, setArtistSuggestions] = useState<string[]>([])

  const [albumIdFilter, setAlbumIdFilter] = useState<string | null>(null)
  const [trackIdFilter, setTrackIdFilter] = useState<string | null>(null)

  const [tracksMeta, setTracksMeta] = useState<Track[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [stats, setStats] = useState<AggregatedStats | null>(null)

  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null)
  const [topTracksRows, setTopTracksRows] = useState<TopTrack[]>([])
  const [topTracksHasMore, setTopTracksHasMore] = useState(false)
  const [topTracksLoadingMore, setTopTracksLoadingMore] = useState(false)

  const isAllPlatformsSelected = selectedPlatformKeys.length === PLATFORM_KEYS.length
  const platformKeysForChart = isAllPlatformsSelected ? PLATFORM_KEYS : selectedPlatformKeys

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

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      setTopTracksRows([])
      setTopTracksHasMore(false)

      try {
        const list = await Promise.all(
          platformKeysForChart.map((k) =>
            fetchPlatformStats(k, {
              artist: artistFilter ?? undefined,
              albumId: albumIdFilter,
              trackId: trackIdFilter,
            }),
          ),
        )
        setStats(buildAllPlatformsChartStats(list))

        const topPage = await fetchTopTracksPage(platformKeysForChart, 0, {
          artist: artistFilter,
          albumId: albumIdFilter,
          trackId: trackIdFilter,
        })
        setTopTracksRows(topPage.tracks)
        setTopTracksHasMore(topPage.hasMore)
      } catch (e) {
        const message = e instanceof Error ? e.message : "Неизвестная ошибка загрузки"
        const status = (e as any)?.status
        if (status === 401) {
          router.replace("/admin26081993")
          return
        }
        setError(message)
        setStats(null)
        setTopTracksRows([])
        setTopTracksHasMore(false)
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [platformKeysForChart, artistFilter, albumIdFilter, trackIdFilter, router])

  useEffect(() => {
    const loadMeta = async () => {
      setLoadingMeta(true)
      try {
        const response = await fetch("/api/admin/tracks", { credentials: "include" })

        if (response.status === 401) {
          router.replace("/admin26081993")
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

  // Автокомплит по артистам (author): показываем список, начинающийся с введенного префикса.
  useEffect(() => {
    const prefix = artistDraft.trim()
    if (!prefix) {
      setArtistSuggestions([])
      return
    }

    const platformForSuggestions = isAllPlatformsSelected
      ? "all"
      : selectedPlatformKeys.length === 1
        ? selectedPlatformKeys[0]!
        : selectedPlatformKeys.join(",")

    let cancelled = false
    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/admin/music-stats/artists?platform=${encodeURIComponent(String(platformForSuggestions))}&prefix=${encodeURIComponent(prefix)}`,
          { signal: controller.signal, credentials: "include" },
        )

        if (!response.ok) {
          setArtistSuggestions([])
          return
        }

        const data = (await response.json().catch(() => null)) as { artists?: string[] } | null
        if (!cancelled) setArtistSuggestions((data?.artists ?? []).slice(0, 20))
      } catch {
        if (!cancelled) setArtistSuggestions([])
      }
    }, 300)

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [artistDraft, isAllPlatformsSelected, selectedPlatformKeys])

  const handleImportChange = async (files: FileList | null) => {
    if (!files?.length) return
    if (importing) return

    const selected = Array.from(files)
    setImporting(true)
    setImportResults(null)

    try {
      toast.message(`Импортируем ${selected.length} файл(ов)...`)
      const result = await importFilesToDb(selected)

      setImportResults(result.results)
      if (result.ok) toast.success(`Импортировано файлов: ${result.results.length}`)
      else toast.error(result.results.find((r) => !r.ok)?.error || "Ошибка импорта")

      // Обновляем график после загрузки выбранной платформы/агрегации.
      setError(null)
      setLoading(true)
      const list = await Promise.all(
        platformKeysForChart.map((k) =>
          fetchPlatformStats(k, {
            artist: artistFilter ?? undefined,
            albumId: albumIdFilter,
            trackId: trackIdFilter,
          }),
        ),
      )
      setStats(buildAllPlatformsChartStats(list))
      const topPage = await fetchTopTracksPage(platformKeysForChart, 0, {
        artist: artistFilter,
        albumId: albumIdFilter,
        trackId: trackIdFilter,
      })
      setTopTracksRows(topPage.tracks)
      setTopTracksHasMore(topPage.hasMore)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Неизвестная ошибка импорта"
      setError(message)
      toast.error(message)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setLoading(false)
    }
  }

  const platformLabelFromKey = (k?: string) => {
    if (!k) return "-"
    const typed = k as MusicPlatformKey
    return MUSIC_PLATFORM_LABELS[typed] ?? k
  }

  const platformTriggerLabel = (() => {
    if (isAllPlatformsSelected) return "Все платформы"
    const labels = selectedPlatformKeys.map((k) => MUSIC_PLATFORM_LABELS[k] ?? k)
    const shown = labels.slice(0, 2).join(", ")
    const rest = labels.length - 2
    return rest > 0 ? `${shown} +${rest}` : shown
  })()

  const trackOptions = useMemo(() => {
    const filteredTracks = albumIdFilter ? tracksMeta.filter((t) => t.albumId === albumIdFilter) : tracksMeta
    const entries = filteredTracks.map((t) => ({
      value: t.id,
      label: `${t.trackName} • ${t.artistName}`,
    }))

    const allLabel = albumIdFilter ? "Все треки альбома" : "Все треки"
    return [{ value: "all", label: allLabel }, ...entries]
  }, [tracksMeta, albumIdFilter])

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

  const handleTrackSelectChange = (v: string) => {
    if (v === "all") {
      setTrackIdFilter(null)
      setAlbumIdFilter(null)
      return
    }

    const track = tracksMeta.find((t) => t.id === v)
    setTrackIdFilter(v)
    setAlbumIdFilter(track?.albumId ?? null)
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 space-y-4">
        <AdminSectionNav active="music-stats" />

        <div>
          <h1 className="text-2xl font-bold">Статистика прослушиваний</h1>
        </div>

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
          <div className="flex flex-col gap-0 md:flex-row md:items-stretch">
            <div className="flex min-w-0 flex-1 items-stretch">
              <div className="shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-10 w-72 max-w-full justify-start rounded-none border border-r-0 transition-none transform-none hover:scale-100 active:scale-100"
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

              <div className="min-w-0 flex-1">
                <div className="flex items-stretch gap-0">
                  <div className="relative min-w-0 flex-1">
                    <Input
                      className="h-10 w-full rounded-none border border-r-0 pr-8"
                      list="artist-suggestions"
                      value={artistDraft}
                      onChange={(e) => {
                        const v = e.target.value
                        setArtistDraft(v)
                        const trimmed = v.trim()
                        // Если введенное значение совпадает с одним из предложенных,
                        // можно сразу применить фильтр.
                        if (trimmed) {
                          const matched = artistSuggestions.find((s) => s.toLowerCase() === trimmed.toLowerCase())
                          if (matched) setArtistFilter(matched)
                        }
                      }}
                      placeholder="Артист (author)"
                    />
                    {artistDraft ? (
                      <button
                        type="button"
                        aria-label="Очистить поле автора"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setArtistDraft("")
                          setArtistFilter(null)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                  <Button
                    variant="outline"
                    className="h-10 shrink-0 rounded-none border border-r-0 px-4"
                    disabled={importing}
                    onClick={() => setArtistFilter(artistDraft.trim() ? artistDraft.trim() : null)}
                  >
                    Ок
                  </Button>
                </div>

                <datalist id="artist-suggestions">
                  {artistSuggestions.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="min-w-0 md:max-w-md md:shrink-0 lg:max-w-lg">
              <div className="relative">
                <Select value={trackIdFilter ?? "all"} onValueChange={handleTrackSelectChange} disabled={loadingMeta}>
                  <SelectTrigger className="data-[size=default]:h-10 h-10 w-full rounded-none border pr-8">
                    <SelectValue placeholder="Треки" />
                  </SelectTrigger>
                    <SelectContent>
                      {trackOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {trackIdFilter ? (
                    <button
                      type="button"
                      aria-label="Очистить фильтр трека"
                      className="absolute right-8 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => handleTrackSelectChange("all")}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

        {importResults ? (
          <Card>
            <CardHeader>
              <CardTitle>Результат загрузки</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {importResults.map((r) => (
                  <div
                    key={r.fileName}
                    className={`flex items-center justify-between border rounded-md px-3 py-2 ${
                      r.ok ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{r.fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {platformLabelFromKey(r.platformKey)}{" "}
                        {r.ok && r.daysCount !== undefined ? `• дней: ${r.daysCount}` : ""}
                      </p>
                    </div>
                    <div className="text-sm font-semibold">
                      {r.ok ? r.totalPlays?.toLocaleString("ru-RU") : "Ошибка"}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

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
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_, payload) => {
                            const dateValue = payload?.[0]?.payload?.date
                            if (!dateValue) return ""
                            return format(new Date(String(dateValue)), "dd.MM.yyyy")
                          }}
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
                      }
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
                <CardTitle className="text-sm">Топ по трекам</CardTitle>
              </CardHeader>
              <CardContent>
                {topTracksRows.length ? (
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
                          {topTracksRows.map((t, i) => (
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

                    {topTracksHasMore ? (
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          disabled={topTracksLoadingMore}
                          onClick={() => {
                            void (async () => {
                              setTopTracksLoadingMore(true)
                              try {
                                const topPage = await fetchTopTracksPage(
                                  platformKeysForChart,
                                  topTracksRows.length,
                                  {
                                    artist: artistFilter,
                                    albumId: albumIdFilter,
                                    trackId: trackIdFilter,
                                  },
                                )
                                setTopTracksRows((prev) => [...prev, ...topPage.tracks])
                                setTopTracksHasMore(topPage.hasMore)
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Не удалось догрузить топ")
                              } finally {
                                setTopTracksLoadingMore(false)
                              }
                            })()
                          }}
                        >
                          {topTracksLoadingMore ? "Загрузка…" : "Еще"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Нет данных для рейтинга треков</p>
                )}
              </CardContent>
            </Card>

            {/* Фильтры вынесены выше над статистикой */}
          </>
        ) : null}

        <div className="flex items-center gap-2 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void handleImportChange(e.target.files)}
          />
          <Button variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            Выбрать файл
          </Button>
          <p className="text-sm text-muted-foreground">
            Поддерживается выбор нескольких файлов разных платформ и периодов.
          </p>
          {importing ? <p className="text-sm text-muted-foreground">Импорт...</p> : null}
        </div>
      </div>
    </div>
  )
}

