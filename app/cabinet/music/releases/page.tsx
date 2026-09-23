"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Music, Search, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { releaseContinueHref } from "@/lib/cabinet/adapters/map-track-to-release"
import { releaseDetailHref } from "@/lib/cabinet/release-presenters"
import { ReleaseCoverCard } from "@/components/cabinet/dashboard/cabinet-dashboard-hero"
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

  const filtered = useMemo(() => {
    return releases.filter(
      (r) => matchesReleaseFilter(r, filter) && matchesReleaseSearch(r, query),
    )
  }, [releases, filter, query])

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader title="Мои релизы">
        <UploadReleaseButton />
      </PageHeader>

      {!loading && releases.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {RELEASE_FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию или артисту"
              className="pl-9"
              aria-label="Поиск релизов"
            />
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
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
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((release) => (
            <div key={release.id} className="space-y-2">
              <ReleaseCoverCard release={release} size="md" />
              {release.kind === "draft" ? (
                <Button size="sm" className="w-full" variant="outline" asChild>
                  <Link href={releaseContinueHref(release)}>
                    {release.status.includes("Ожидает оплаты") ? "Оплатить" : "Продолжить"}
                  </Link>
                </Button>
              ) : (
                <Button size="sm" className="w-full" variant="ghost" asChild>
                  <Link href={releaseDetailHref(release)}>Открыть релиз</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
