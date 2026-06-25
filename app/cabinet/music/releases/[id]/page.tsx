"use client"

import { use } from "react"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowLeft, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import { releaseContinueHref } from "@/lib/cabinet/adapters/map-track-to-release"
import { formatReleaseRelativeDate } from "@/lib/cabinet/release-presenters"
import { RELEASE_WORKFLOW_ACTIONS } from "@/lib/cabinet/release-workflow-actions"
import { cn } from "@/lib/utils"

const ACCENT_BG: Record<string, string> = {
  primary: "from-primary/15 via-transparent to-transparent",
  violet: "from-violet-500/15 via-transparent to-transparent",
  blue: "from-blue-500/15 via-transparent to-transparent",
  amber: "from-amber-500/15 via-transparent to-transparent",
  emerald: "from-emerald-500/15 via-transparent to-transparent",
}

export default function ReleaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { releases, loading } = useCabinetReleases()
  const release = releases.find((r) => r.id === id)

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!release) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <p className="text-muted-foreground">Релиз не найден</p>
        <Button asChild variant="outline">
          <Link href="/cabinet/music/releases">К списку релизов</Link>
        </Button>
      </div>
    )
  }

  if (release.kind === "draft") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <p className="text-muted-foreground">Это черновик — продолжите загрузку в мастере</p>
        <Button asChild>
          <Link href={releaseContinueHref(release)}>Продолжить релиз</Link>
        </Button>
      </div>
    )
  }

  const relativeDate = formatReleaseRelativeDate(release.releaseDate)

  return (
    <div className="max-w-4xl space-y-10">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/cabinet/music/releases">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Все релизы
        </Link>
      </Button>

      <section className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="relative h-48 w-48 sm:h-56 sm:w-56 shrink-0 rounded-xl overflow-hidden shadow-xl ring-1 ring-border">
          {release.coverUrl ? (
            <Image src={release.coverUrl} alt="" fill className="object-cover" unoptimized sizes="224px" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Music className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
        </div>
        <div className="space-y-3 min-w-0 flex-1">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-widest">Релиз</p>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{release.title}</h1>
            <p className="text-lg text-muted-foreground mt-1">{release.artist}</p>
          </div>
          <StatusBadge status={release.status} kind="generic" />
          {release.releaseDate ? (
            <p className="text-sm text-muted-foreground">
              {format(new Date(release.releaseDate), "d MMMM yyyy", { locale: ru })}
              {relativeDate ? ` · ${relativeDate}` : ""}
            </p>
          ) : null}
          {release.platforms && release.platforms.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {release.platforms.map((p) => (
                <span key={p} className="text-xs rounded-full border border-border px-2.5 py-1">
                  {p}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Что можно сделать?</h2>
          <p className="text-sm text-muted-foreground">
            Следующие шаги для «{release.title}» — продвижение, оформление и инструменты
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {RELEASE_WORKFLOW_ACTIONS.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              className="group relative overflow-hidden rounded-xl border border-border p-4 hover:border-primary/40 transition-all"
            >
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-70 group-hover:opacity-100 transition-opacity",
                  ACCENT_BG[action.accent]
                )}
              />
              <div className="relative flex gap-3 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/70 border border-border/60">
                  <action.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{action.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{action.description}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
