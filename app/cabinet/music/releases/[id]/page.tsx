"use client"

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowLeft, Music } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { useCabinetReleases } from "@/lib/cabinet/hooks/use-cabinet-releases"
import {
  formatReleaseKindMeta,
  releaseContinueHref,
  releaseContinueLabel,
} from "@/lib/cabinet/adapters/map-track-to-release"
import { formatReleaseRelativeDate } from "@/lib/cabinet/release-presenters"
import { RELEASE_WORKFLOW_ACTIONS } from "@/lib/cabinet/release-workflow-actions"
import {
  ModerationNoteAside,
  ReleaseInfoButton,
  ReleaseTrackListPlayer,
} from "@/components/cabinet/releases/release-detail-panels"
import type { Release } from "@/lib/releases"
import type { Track } from "@/lib/tracks"
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
  const { releases, loading: listLoading } = useCabinetReleases()
  const releaseView = releases.find((r) => r.id === id)

  const [entityRelease, setEntityRelease] = useState<Release | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [detailLoading, setDetailLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/cabinet/releases/${id}`, { credentials: "include" })
        if (res.ok) {
          const data = (await res.json()) as { release?: Release; tracks?: Track[] }
          if (!cancelled) {
            setEntityRelease(data.release ?? null)
            setTracks(data.tracks ?? [])
          }
          return
        }

        const tracksRes = await fetch("/api/cabinet/tracks", { credentials: "include" })
        if (!tracksRes.ok) {
          if (!cancelled) {
            setEntityRelease(null)
            setTracks([])
          }
          return
        }
        const all = (((await tracksRes.json()) as { tracks?: Track[] }).tracks ?? [])
        const matched = all.filter(
          (t) => t.id === id || t.albumId === id || t.releaseId === id,
        )
        if (!cancelled) {
          setEntityRelease(null)
          setTracks(
            matched.sort((a, b) => (a.trackOrder ?? 0) - (b.trackOrder ?? 0)),
          )
        }
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id])

  const moderationNote = useMemo(() => {
    for (const t of tracks) {
      const note = t.moderationNote?.trim()
      if (note) return note
    }
    return null
  }, [tracks])

  const loading = listLoading || detailLoading

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!releaseView && tracks.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <p className="text-muted-foreground">Релиз не найден</p>
        <Button asChild variant="outline">
          <Link href="/cabinet/music/releases">К списку релизов</Link>
        </Button>
      </div>
    )
  }

  if (releaseView?.kind === "draft") {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <p className="text-muted-foreground">Это черновик — продолжите загрузку в мастере</p>
        <Button asChild>
          <Link href={releaseContinueHref(releaseView)}>{releaseContinueLabel(releaseView)}</Link>
        </Button>
      </div>
    )
  }

  const title = releaseView?.title ?? entityRelease?.title ?? tracks[0]?.trackName ?? "Релиз"
  const artist = releaseView?.artist ?? entityRelease?.artistName ?? tracks[0]?.artistName ?? "—"
  const statusLabel = releaseView?.status ?? "На модерации"
  const releaseDate = releaseView?.releaseDate ?? entityRelease?.releaseDate ?? tracks[0]?.releaseDate
  const relativeDate = formatReleaseRelativeDate(releaseDate)
  const coverUrl =
    releaseView?.coverUrl ??
    (entityRelease?.coverPath ? `/api/cabinet/releases/${entityRelease.id}/cover` : undefined) ??
    (tracks[0]?.coverPath
      ? tracks[0].releaseId
        ? `/api/cabinet/releases/${tracks[0].releaseId}/cover`
        : `/api/cabinet/uploads/cover/${tracks[0].id}`
      : undefined)
  const isAlbum =
    releaseView?.format === "album" ||
    entityRelease?.kind === "album" ||
    tracks.length > 1
  const kindMeta =
    releaseView != null
      ? formatReleaseKindMeta(releaseView)
      : isAlbum
        ? `Альбом · ${tracks.length}`
        : "Сингл"
  const audioReleaseId = entityRelease?.id ?? tracks[0]?.releaseId ?? null

  return (
    <div className="max-w-4xl space-y-10">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/cabinet/music/releases">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Все релизы
        </Link>
      </Button>

      <section className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col sm:flex-row gap-6 items-start min-w-0 flex-1">
          <div className="relative h-48 w-48 sm:h-56 sm:w-56 shrink-0 rounded-xl overflow-hidden shadow-xl ring-1 ring-border">
            {coverUrl ? (
              <Image src={coverUrl} alt="" fill className="object-cover" unoptimized sizes="224px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <Music className="h-12 w-12 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="space-y-3 min-w-0 flex-1">
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-widest">
                {isAlbum ? "Альбом" : "Сингл"}
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-lg text-muted-foreground mt-1">{artist}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={statusLabel} kind="generic" />
              {kindMeta ? (
                <span className="text-xs rounded-md border border-border px-2 py-0.5 text-muted-foreground">
                  {kindMeta}
                </span>
              ) : null}
            </div>
            {releaseDate ? (
              <p className="text-sm text-muted-foreground">
                {format(new Date(releaseDate), "d MMMM yyyy", { locale: ru })}
                {relativeDate ? ` · ${relativeDate}` : ""}
              </p>
            ) : null}
            {releaseView?.platforms && releaseView.platforms.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {releaseView.platforms.map((p) => (
                  <span key={p} className="text-xs rounded-full border border-border px-2.5 py-1">
                    {p}
                  </span>
                ))}
              </div>
            ) : null}
            <ReleaseInfoButton release={entityRelease} tracks={tracks} />
          </div>
        </div>
        {moderationNote ? <ModerationNoteAside note={moderationNote} /> : null}
      </section>

      {tracks.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{isAlbum ? "Треки альбома" : "Трек"}</h2>
          <ReleaseTrackListPlayer
            releaseId={audioReleaseId}
            tracks={tracks}
            isAlbum={isAlbum}
          />
        </section>
      ) : null}

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Что можно сделать?</h2>
          <p className="text-sm text-muted-foreground">
            Следующие шаги для «{title}» — продвижение, оформление и инструменты
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
                  ACCENT_BG[action.accent],
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
