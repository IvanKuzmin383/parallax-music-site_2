import { differenceInCalendarDays, formatDistanceToNow, parseISO, startOfDay } from "date-fns"
import { ru } from "date-fns/locale"
import type { ReleaseView } from "./types"
import { releaseContinueHref } from "./adapters/map-track-to-release"

export function releaseDetailHref(release: ReleaseView): string {
  if (release.kind === "draft") return releaseContinueHref(release)
  return `/cabinet/music/releases/${release.id}`
}

export function pickFeaturedRelease(releases: ReleaseView[]): ReleaseView | null {
  const priority = (r: ReleaseView) => {
    if (r.status === "Выпущен") return 0
    if (r.status.includes("площадк") || r.status.includes("Одобрен")) return 1
    if (r.kind === "draft" || r.status.includes("модерац") || r.status.includes("Ожидает")) return 2
    return 3
  }
  const sorted = [...releases].sort((a, b) => priority(a) - priority(b))
  return sorted[0] ?? null
}

/** Ближайший будущий релиз по дате выхода. */
export function pickUpcomingRelease(releases: ReleaseView[]): ReleaseView | null {
  const today = startOfDay(new Date())
  const upcoming = releases
    .filter((r) => {
      if (!r.releaseDate?.trim()) return false
      try {
        const d = startOfDay(parseISO(r.releaseDate))
        if (Number.isNaN(d.getTime())) return false
        return d >= today
      } catch {
        return false
      }
    })
    .sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""))
  return upcoming[0] ?? null
}

export function daysUntilRelease(releaseDate?: string): number | null {
  if (!releaseDate?.trim()) return null
  try {
    const d = startOfDay(parseISO(releaseDate))
    if (Number.isNaN(d.getTime())) return null
    return differenceInCalendarDays(d, startOfDay(new Date()))
  } catch {
    return null
  }
}

export function formatReleaseRelativeDate(releaseDate?: string): string | null {
  if (!releaseDate?.trim()) return null
  try {
    const d = parseISO(releaseDate)
    if (Number.isNaN(d.getTime())) return null
    return formatDistanceToNow(d, { addSuffix: true, locale: ru })
  } catch {
    return null
  }
}

export function isReleasedStatus(status: string): boolean {
  return (
    status === "Выпущен" ||
    status.includes("площадк") ||
    status.includes("Одобрен")
  )
}
