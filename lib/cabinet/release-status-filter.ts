import { normalizeArtistForPolicy } from "@/lib/artist-name-normalize"
import type { ReleaseView } from "./types"

/** Ключ «все проекты» в переключателе артиста. */
export const RELEASE_ARTIST_FILTER_ALL = "all"

export function matchesReleaseArtist(
  release: Pick<ReleaseView, "artist">,
  artistFilter: string | string[],
): boolean {
  if (Array.isArray(artistFilter)) {
    if (artistFilter.length === 0) return true
    const target = normalizeArtistForPolicy(release.artist)
    return artistFilter.some((a) => normalizeArtistForPolicy(a) === target)
  }
  if (!artistFilter || artistFilter === RELEASE_ARTIST_FILTER_ALL) return true
  return normalizeArtistForPolicy(release.artist) === normalizeArtistForPolicy(artistFilter)
}

/** Уникальные имена артистов из релизов (как в карточке, с исходным регистром). */
export function collectReleaseArtists(releases: Pick<ReleaseView, "artist">[]): string[] {
  const byNorm = new Map<string, string>()
  for (const r of releases) {
    const raw = r.artist?.trim()
    if (!raw || raw === "-") continue
    const norm = normalizeArtistForPolicy(raw)
    if (!norm || byNorm.has(norm)) continue
    byNorm.set(norm, raw)
  }
  return [...byNorm.values()].sort((a, b) => a.localeCompare(b, "ru"))
}

export type ReleaseFilterKey =
  | "all"
  | "draft"
  | "awaiting_payment"
  | "upload_pending"
  | "on_moderation"
  | "on_platforms"
  | "released"
  | "rejected"

export const RELEASE_FILTERS: { key: ReleaseFilterKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "draft", label: "Черновики" },
  { key: "awaiting_payment", label: "Ожидает оплаты" },
  { key: "upload_pending", label: "Требуется доработка" },
  { key: "on_moderation", label: "На модерации" },
  { key: "on_platforms", label: "На площадках" },
  { key: "released", label: "Выпущены" },
  { key: "rejected", label: "Отклонённые" },
]

export function matchesReleaseFilter(release: ReleaseView, filter: ReleaseFilterKey): boolean {
  if (filter === "all") return true

  const label = release.status
  const raw = release.releaseStatus

  switch (filter) {
    case "draft":
      return (
        label === "Черновик" ||
        raw === "draft" ||
        (release.kind === "draft" &&
          raw !== "awaiting_payment" &&
          raw !== "upload_pending" &&
          raw !== "rejected")
      )
    case "awaiting_payment":
      return label.includes("оплат") || raw === "awaiting_payment"
    case "upload_pending":
      return label.includes("доработ") || raw === "upload_pending"
    case "on_moderation":
      return (
        (label.includes("модерац") || raw === "on_moderation") &&
        raw !== "upload_pending" &&
        !label.includes("доработ")
      )
    case "on_platforms":
      return (
        label.includes("площадк") ||
        label.includes("агрегатор") ||
        raw === "sent_to_platforms" ||
        raw === "approved_by_platforms"
      )
    case "released":
      return label === "Выпущен" || raw === "released"
    case "rejected":
      return (
        label === "Отклонён" ||
        label === "Отозван" ||
        label === "Отложен" ||
        raw === "rejected" ||
        raw === "postponed"
      )
    default:
      return true
  }
}

export function matchesReleaseSearch(release: ReleaseView, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  if (
    release.title.toLowerCase().includes(q) ||
    release.artist.toLowerCase().includes(q) ||
    release.status.toLowerCase().includes(q)
  ) {
    return true
  }
  return Boolean(release.tracks?.some((t) => t.name.toLowerCase().includes(q)))
}
