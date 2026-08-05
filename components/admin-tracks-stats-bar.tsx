"use client"

import type { TrackStatus } from "@/lib/tracks"
import type { AdminTracksStats } from "@/lib/admin-tracks-query-shared"
import { cn } from "@/lib/utils"

export type TracksViewFilter =
  | { type: "all" }
  | { type: "status"; status: TrackStatus }
  | { type: "upcoming" }
  | { type: "upload_drafts" }

const STATUS_CARDS: { value: TrackStatus; label: string; shortLabel: string }[] = [
  { value: "upload_pending", label: "Требуется доработка", shortLabel: "Доработка" },
  { value: "on_moderation", label: "На модерации", shortLabel: "Модерация" },
  { value: "sent_to_platforms", label: "Модерация стриминг-сервисами", shortLabel: "Стриминги" },
  { value: "approved_by_platforms", label: "Одобрен площадками", shortLabel: "Одобрено" },
  { value: "released", label: "Выпущен", shortLabel: "Выпущен" },
  { value: "rejected", label: "Отклонено", shortLabel: "Отклонено" },
  { value: "postponed", label: "Отложено", shortLabel: "Отложено" },
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
        "rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card",
        className
      )}
    >
      <p className="text-xs text-muted-foreground leading-tight line-clamp-2">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{count}</p>
      <p className="text-xs text-muted-foreground">{countLabel(count, unit)}</p>
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-2">
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
        label="Ближайшие релизы"
        count={stats.upcomingCount}
        active={isFilterActive(viewFilter, { type: "upcoming" })}
        onClick={() => onViewFilterChange({ type: "upcoming" })}
        className="border-primary/20"
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
