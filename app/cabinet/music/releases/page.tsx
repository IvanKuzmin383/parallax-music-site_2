"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
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
import { PageHeader } from "@/components/cabinet/shared/page-header"
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
  matchesReleaseFilter,
  matchesReleaseSearch,
  RELEASE_FILTERS,
  type ReleaseFilterKey,
} from "@/lib/cabinet/release-status-filter"
import { resolveStatusTone } from "@/components/cabinet/shared/status-badge"
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

const FILTER_TONE_CLASS: Record<string, string> = {
  slate:
    "border-slate-500/40 text-slate-200 hover:bg-slate-500/15 data-[active=true]:bg-slate-500/30 data-[active=true]:text-slate-50",
  amber:
    "border-amber-500/40 text-amber-200 hover:bg-amber-500/15 data-[active=true]:bg-amber-500/35 data-[active=true]:text-amber-50",
  orange:
    "border-orange-500/40 text-orange-200 hover:bg-orange-500/15 data-[active=true]:bg-orange-500/35 data-[active=true]:text-orange-50",
  sky: "border-sky-500/40 text-sky-200 hover:bg-sky-500/15 data-[active=true]:bg-sky-500/35 data-[active=true]:text-sky-50",
  blue: "border-blue-500/40 text-blue-200 hover:bg-blue-500/15 data-[active=true]:bg-blue-500/35 data-[active=true]:text-blue-50",
  violet:
    "border-violet-500/40 text-violet-200 hover:bg-violet-500/15 data-[active=true]:bg-violet-500/35 data-[active=true]:text-violet-50",
  teal: "border-teal-500/40 text-teal-200 hover:bg-teal-500/15 data-[active=true]:bg-teal-500/35 data-[active=true]:text-teal-50",
  emerald:
    "border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/15 data-[active=true]:bg-emerald-500/35 data-[active=true]:text-emerald-50",
  red: "border-red-500/40 text-red-200 hover:bg-red-500/15 data-[active=true]:bg-red-500/35 data-[active=true]:text-red-50",
  zinc: "border-zinc-500/40 text-zinc-300 hover:bg-zinc-500/15 data-[active=true]:bg-zinc-500/35 data-[active=true]:text-zinc-50",
}

function filterTone(key: ReleaseFilterKey): string {
  if (key === "all") return ""
  if (key === "on_platforms") return FILTER_TONE_CLASS.violet
  return FILTER_TONE_CLASS[resolveStatusTone(key)] ?? ""
}

type SortKey = "newest" | "oldest" | "title"

function UploadReleaseButton({ variant = "default" }: { variant?: "default" | "outline" }) {
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
      <Link href="/cabinet/upload">{buttonInner}</Link>
    </Button>
  )
}

export default function MusicReleasesPage() {
  const { releases, loading } = useCabinetReleases()
  const [filter, setFilter] = useState<ReleaseFilterKey>("all")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<SortKey>("newest")

  const counts = useMemo(() => {
    const map = {} as Record<ReleaseFilterKey, number>
    for (const f of RELEASE_FILTERS) {
      map[f.key] =
        f.key === "all" ? releases.length : releases.filter((r) => matchesReleaseFilter(r, f.key)).length
    }
    return map
  }, [releases])

  const filtered = useMemo(() => {
    const list = releases.filter(
      (r) => matchesReleaseFilter(r, filter) && matchesReleaseSearch(r, query),
    )
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
      // Черновики / без даты — по id как стабильный прокси «свежести»
      return sort === "newest" ? b.id.localeCompare(a.id) : a.id.localeCompare(b.id)
    })
    return sorted
  }, [releases, filter, query, sort])

  return (
    <div className="w-full max-w-none space-y-6">
      <PageHeader title="Мои релизы">
        <UploadReleaseButton />
      </PageHeader>

      {!loading && releases.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card/40 p-2 sm:p-2.5">
            {RELEASE_FILTERS.map((f) => {
              const active = filter === f.key
              return (
                <button
                  key={`stat-${f.key}`}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-left transition-colors",
                    active ? STAT_ACTIVE_BG[f.key] : "hover:bg-muted/50",
                  )}
                >
                  <span className={cn("text-lg font-semibold tabular-nums", COUNT_TONE[f.key])}>
                    {counts[f.key]}
                  </span>{" "}
                  <span
                    className={cn(
                      "text-sm",
                      active ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {STAT_LABELS[f.key]}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {RELEASE_FILTERS.map((f) => (
                <Button
                  key={f.key}
                  size="sm"
                  variant="outline"
                  data-active={filter === f.key}
                  className={cn(
                    "rounded-full",
                    filter === f.key &&
                      f.key === "all" &&
                      "bg-primary text-primary-foreground border-primary",
                    f.key !== "all" && filterTone(f.key),
                    filter === f.key && f.key !== "all" && "ring-1 ring-current/30",
                  )}
                  onClick={() => setFilter(f.key)}
                >
                  {f.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-end shrink-0">
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
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-full sm:w-[11.5rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Сначала новые</SelectItem>
                  <SelectItem value="oldest">Сначала старые</SelectItem>
                  <SelectItem value="title">По названию</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
          action={<UploadReleaseButton />}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description="Попробуйте другой статус или поисковый запрос"
          icon={Search}
          action={
            <Button
              variant="outline"
              onClick={() => {
                setFilter("all")
                setQuery("")
              }}
            >
              Сбросить фильтры
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((release) => (
            <ReleaseListCard key={release.id} release={release} />
          ))}
        </div>
      )}
    </div>
  )
}
