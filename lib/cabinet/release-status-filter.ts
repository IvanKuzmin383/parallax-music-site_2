import type { ReleaseView } from "./types"

export type ReleaseFilterKey =
  | "all"
  | "draft"
  | "awaiting_payment"
  | "on_moderation"
  | "on_platforms"
  | "released"
  | "rejected"

export const RELEASE_FILTERS: { key: ReleaseFilterKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "draft", label: "Черновики" },
  { key: "awaiting_payment", label: "Ожидает оплаты" },
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
        (release.kind === "draft" && raw !== "awaiting_payment")
      )
    case "awaiting_payment":
      return label.includes("оплат") || raw === "awaiting_payment"
    case "on_moderation":
      return label.includes("модерац") || raw === "on_moderation"
    case "on_platforms":
      return (
        label.includes("площадк") ||
        raw === "sent_to_platforms" ||
        raw === "approved_by_platforms"
      )
    case "released":
      return label === "Выпущен" || raw === "released"
    case "rejected":
      return (
        label === "Отклонён" ||
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
  return (
    release.title.toLowerCase().includes(q) ||
    release.artist.toLowerCase().includes(q) ||
    release.status.toLowerCase().includes(q)
  )
}
