"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Music, Search, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { ReleaseListCard } from "@/components/cabinet/releases/release-list-card"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  collectReleaseArtists,
  matchesReleaseArtist,
  matchesReleaseFilter,
  matchesReleaseSearch,
  RELEASE_ARTIST_FILTER_ALL,
  RELEASE_FILTERS,
  type ReleaseFilterKey,
} from "@/lib/cabinet/release-status-filter"
import { normalizeArtistForPolicy } from "@/lib/artist-name-normalize"
import type { ReleaseView } from "@/lib/cabinet/types"
import { ArtistProjectSwitcher } from "@/components/cabinet/shared/artist-project-switcher"
import { buildArtistCounts } from "@/lib/cabinet/hooks/use-artist-project-filter"
import { cn } from "@/lib/utils"

const STAT_LABELS: Record<ReleaseFilterKey, string> = {
  all: "Все релизы",
  draft: "Черновики",
  awaiting_payment: "Ожидают оплаты",
  upload_pending: "Требуется доработка",
  on_moderation: "На модерации",
  on_platforms: "На площадках",
  released: "Выпущены",
  rejected: "Отклонённые",
}

const COUNT_TONE: Record<ReleaseFilterKey, string> = {
  all: "text-primary",
  draft: "text-foreground",
  awaiting_payment: "text-amber-400",
  upload_pending: "text-red-400",
  on_moderation: "text-blue-400",
  on_platforms: "text-violet-400",
  released: "text-emerald-400",
  rejected: "text-zinc-400",
}

const STAT_ACTIVE_BG: Record<ReleaseFilterKey, string> = {
  all: "bg-primary/20 ring-1 ring-primary/50",
  draft: "bg-muted ring-1 ring-border",
  awaiting_payment: "bg-amber-500/20 ring-1 ring-amber-500/50",
  upload_pending: "bg-red-500/20 ring-1 ring-red-500/50",
  on_moderation: "bg-blue-500/20 ring-1 ring-blue-500/50",
  on_platforms: "bg-violet-500/20 ring-1 ring-violet-500/50",
  released: "bg-emerald-500/20 ring-1 ring-emerald-500/50",
  rejected: "bg-zinc-500/20 ring-1 ring-zinc-500/50",
}

type SortKey = "newest" | "oldest" | "title"

function sortReleases(list: ReleaseView[], sort: SortKey): ReleaseView[] {
  const sorted = [...list]
  sorted.sort((a, b) => {
    if (sort === "title") {
      return a.title.localeCompare(b.title, "ru")
    }
    const da = a.releaseDate ?? ""
    const db = b.releaseDate ?? ""
    if (da && db && da !== db) {
      return sort === "newest" ? db.localeCompare(da) : da.localeCompare(db)
    }
    return sort === "newest" ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)
  })
  return sorted
}

function UploadReleaseButton({
  variant = "default",
  artist,
}: {
  variant?: "default" | "outline"
  artist?: string
}) {
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/cabinet/user", { credentials: "include" })
        if (!res.ok) {
          setProfileComplete(false)
          return
        }
        const data = (await res.json()) as { user?: { profileCompleteForUpload?: boolean } }
        setProfileComplete(data.user?.profileCompleteForUpload === true)
      } catch {
        setProfileComplete(false)
      }
    })()
  }, [])

  const disabled = profileComplete === false
  const loading = profileComplete === null
  const uploadHref =
    artist && artist !== RELEASE_ARTIST_FILTER_ALL
      ? `/cabinet/upload?artist=${encodeURIComponent(artist)}`
      : "/cabinet/upload"

  const buttonInner = (
    <>
      <Upload className="h-4 w-4 mr-2" />
      Загрузить релиз
    </>
  )

  if (loading) {
    return (
      <Button variant={variant} disabled>
        {buttonInner}
      </Button>
    )
  }

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant={variant} disabled>
              {buttonInner}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Заполните обязательные поля в профиле, чтобы загрузить релиз
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Button asChild variant={variant}>
      <Link href={uploadHref}>{buttonInner}</Link>
    </Button>
  )
}

function MusicReleasesPageContent() {
  const { releases, loading, reload } = useCabinetReleases()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [filter, setFilter] = useState<ReleaseFilterKey>("all")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("newest")
  const [artistFilter, setArtistFilter] = useState<string>(RELEASE_ARTIST_FILTER_ALL)

  const artists = useMemo(() => collectReleaseArtists(releases), [releases])
  const artistCounts = useMemo(() => buildArtistCounts(releases), [releases])
  const showArtistSwitcher = artists.length > 1

  useEffect(() => {
    const fromUrl = searchParams.get("artist")?.trim()
    if (!fromUrl) {
      setArtistFilter(RELEASE_ARTIST_FILTER_ALL)
      return
    }
    const match = artists.find(
      (a) => normalizeArtistForPolicy(a) === normalizeArtistForPolicy(fromUrl)
    )
    if (match) {
      setArtistFilter(match)
      return
    }
    if (artists.length === 0) {
      setArtistFilter(fromUrl)
      return
    }
    setArtistFilter(RELEASE_ARTIST_FILTER_ALL)
  }, [searchParams, artists])

  const setArtistInUrl = (value: string) => {
    setArtistFilter(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value === RELEASE_ARTIST_FILTER_ALL) {
      params.delete("artist")
    } else {
      params.set("artist", value)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const artistScoped = useMemo(
    () => releases.filter((r) => matchesReleaseArtist(r, artistFilter)),
    [releases, artistFilter]
  )

  const counts = useMemo(() => {
    const map = {} as Record<ReleaseFilterKey, number>
    for (const f of RELEASE_FILTERS) {
      map[f.key] =
        f.key === "all"
          ? artistScoped.length
          : artistScoped.filter((r) => matchesReleaseFilter(r, f.key)).length
    }
    return map
  }, [artistScoped])

  const filtered = useMemo(() => {
    const list = artistScoped.filter(
      (r) => matchesReleaseFilter(r, filter) && matchesReleaseSearch(r, query)
    )
    return sortReleases(list, sort)
  }, [artistScoped, filter, query, sort])

  const groupedForAllArtists = useMemo(() => {
    if (!showArtistSwitcher || artistFilter !== RELEASE_ARTIST_FILTER_ALL) return null
    const groups: { artist: string; items: ReleaseView[] }[] = []
    const indexByNorm = new Map<string, number>()
    for (const release of filtered) {
      const name = release.artist?.trim() || "Без артиста"
      const norm = normalizeArtistForPolicy(name) || "__empty__"
      const existing = indexByNorm.get(norm)
      if (existing === undefined) {
        indexByNorm.set(norm, groups.length)
        groups.push({ artist: name, items: [release] })
      } else {
        groups[existing]!.items.push(release)
      }
    }
    groups.sort((a, b) => a.artist.localeCompare(b.artist, "ru"))
    return groups
  }, [filtered, showArtistSwitcher, artistFilter])

  const resetFilters = () => {
    setFilter("all")
    setQuery("")
    setArtistInUrl(RELEASE_ARTIST_FILTER_ALL)
  }

  const uploadArtist =
    artistFilter !== RELEASE_ARTIST_FILTER_ALL ? artistFilter : undefined

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-3">
          <h1 className="text-2xl font-bold tracking-tight leading-tight md:text-3xl">
            Мои релизы
          </h1>
          {!loading ? (
            <ArtistProjectSwitcher
              artists={artistCounts}
              value={artistFilter}
              onChange={setArtistInUrl}
              allCount={releases.length}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="relative w-full sm:w-[16rem]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию или артисту"
              className="pl-9 h-9"
              aria-label="Поиск релизов"
            />
          </div>
          <UploadReleaseButton artist={uploadArtist} />
        </div>
      </div>

      {!loading && artistScoped.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-card/40 p-2 sm:p-2.5">
          {RELEASE_FILTERS.map((f) => {
            const active = filter === f.key
            return (
              <button
                key={`stat-${f.key}`}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-lg px-3 py-2 text-left transition-colors",
                  active ? STAT_ACTIVE_BG[f.key] : "hover:bg-muted/50"
                )}
              >
                <span className={cn("text-lg font-semibold tabular-nums", COUNT_TONE[f.key])}>
                  {counts[f.key]}
                </span>{" "}
                <span
                  className={cn("text-sm", active ? "text-foreground" : "text-muted-foreground")}
                >
                  {STAT_LABELS[f.key]}
                </span>
              </button>
            )
          })}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="ml-auto h-9 w-full sm:w-[11.5rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Сначала новые</SelectItem>
              <SelectItem value="oldest">Сначала старые</SelectItem>
              <SelectItem value="title">По названию</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : releases.length === 0 ? (
        <EmptyState
          title="Релизов пока нет"
          description="Загрузите первый релиз"
          icon={Music}
          action={<UploadReleaseButton artist={uploadArtist} />}
        />
      ) : artistScoped.length === 0 ? (
        <EmptyState
          title="У этого проекта пока нет релизов"
          description={
            artistFilter !== RELEASE_ARTIST_FILTER_ALL
              ? `Загрузите релиз для «${artistFilter}»`
              : "Загрузите первый релиз"
          }
          icon={Music}
          action={<UploadReleaseButton artist={uploadArtist} />}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте другой статус, проект или поисковый запрос"
          icon={Search}
          action={
            <Button variant="outline" onClick={resetFilters}>
              Сбросить фильтры
            </Button>
          }
        />
      ) : groupedForAllArtists ? (
        <div className="space-y-8">
          {groupedForAllArtists.map((group) => (
            <section key={group.artist} className="space-y-3">
              <h2 className="text-base font-semibold">{group.artist}</h2>
              <div className="grid gap-3 md:grid-cols-2">
                {group.items.map((release) => (
                  <ReleaseListCard
                    key={release.id}
                    release={release}
                    onDeleted={() => void reload()}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((release) => (
            <ReleaseListCard key={release.id} release={release} onDeleted={() => void reload()} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function MusicReleasesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <MusicReleasesPageContent />
    </Suspense>
  )
}
