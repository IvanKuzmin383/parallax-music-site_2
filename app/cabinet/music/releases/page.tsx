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
      <PageHeader title="Мои релизы" className="mb-0 sm:items-center">
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
        <UploadReleaseButton />
      </PageHeader>

      {!loading && releases.length > 0 ? (
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
