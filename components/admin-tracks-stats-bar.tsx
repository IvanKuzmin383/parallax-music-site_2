"use client"

import type { TrackStatus } from "@/lib/tracks"
import type { AdminTracksStats } from "@/lib/admin-tracks-query-shared"
import { cn } from "@/lib/utils"

export type TracksViewFilter =
  | { type: "all" }
  | { type: "status"; status: TrackStatus }
  | { type: "releases_today" }
  | { type: "upload_drafts" }

const STATUS_CARDS: { value: TrackStatus; label: string; shortLabel: string }[] = [
  { value: "upload_pending", label: "Требуется доработка", shortLabel: "Доработка" },
  { value: "on_moderation", label: "На модерации", shortLabel: "Модерация" },
  { value: "sent_to_platforms", label: "Отправлен агрегатору", shortLabel: "Агрегатор" },
  { value: "approved_by_platforms", label: "Отправлен на площадки", shortLabel: "Площадки" },
  { value: "released", label: "Выпущен", shortLabel: "Выпущен" },
  { value: "rejected", label: "Отклонено", shortLabel: "Отклонено" },
  { value: "postponed", label: "Отозван", shortLabel: "Отозван" },
]

function countLabel(count: number, unit: "tracks" | "drafts"): string {
  const n = Math.abs(count) % 100
  const n1 = n % 10
  if (unit === "drafts") {
    if (n > 10 && n < 20) return "заявок"
    if (n1 === 1) return "заявка"
    if (n1 >= 2 && n1 <= 4) return "заявки"
    return "заявок"
  }
  if (n > 10 && n < 20) return "треков"
  if (n1 === 1) return "трек"
  if (n1 >= 2 && n1 <= 4) return "трека"
  return "треков"
}

function isFilterActive(viewFilter: TracksViewFilter, target: TracksViewFilter): boolean {
  if (viewFilter.type !== target.type) return false
  if (viewFilter.type === "status" && target.type === "status") {
    return viewFilter.status === target.status
  }
  return true
}

type StatCardProps = {
  label: string
  count: number
  unit?: "tracks" | "drafts"
  active: boolean
  onClick: () => void
  className?: string
}

function StatCard({ label, count, unit = "tracks", active, onClick, className, title }: StatCardProps & { title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-md border px-2.5 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card",
        className
      )}
    >
      <p className="text-[11px] leading-tight text-muted-foreground line-clamp-1">{label}</p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="text-lg font-semibold tabular-nums leading-none">{count}</span>
        <span className="text-[11px] text-muted-foreground">{countLabel(count, unit)}</span>
      </p>
    </button>
  )
}

type AdminTracksStatsBarProps = {
  stats: AdminTracksStats
  viewFilter: TracksViewFilter
  onViewFilterChange: (filter: TracksViewFilter) => void
}

export function AdminTracksStatsBar({
  stats,
  viewFilter,
  onViewFilterChange,
}: AdminTracksStatsBarProps) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10">
      <StatCard
        label="Все треки"
        count={stats.total}
        active={isFilterActive(viewFilter, { type: "all" })}
        onClick={() => onViewFilterChange({ type: "all" })}
      />
      {STATUS_CARDS.map((opt) => (
        <StatCard
          key={opt.value}
          label={opt.shortLabel}
          count={stats.byStatus[opt.value] ?? 0}
          active={isFilterActive(viewFilter, { type: "status", status: opt.value })}
          onClick={() => onViewFilterChange({ type: "status", status: opt.value })}
          title={opt.label}
        />
      ))}
      <StatCard
        label="Релизы сегодня"
        count={stats.releasesTodayCount}
        active={isFilterActive(viewFilter, { type: "releases_today" })}
        onClick={() => onViewFilterChange({ type: "releases_today" })}
        className="border-primary/20"
        title="Треки с датой публикации на сегодня"
      />
      <StatCard
        label="Черновики загрузки"
        count={stats.uploadDraftsCount}
        unit="drafts"
        active={isFilterActive(viewFilter, { type: "upload_drafts" })}
        onClick={() => onViewFilterChange({ type: "upload_drafts" })}
        className="border-dashed"
      />
    </div>
  )
}

export { STATUS_CARDS as ADMIN_TRACKS_STATUS_CARDS }
