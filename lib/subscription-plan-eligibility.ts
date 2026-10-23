import { normalizeArtistForPolicy } from "@/lib/artist-name-normalize"
import type { PlanId } from "@/lib/plan-pricing"
import { planIdToSubscriptionName } from "@/lib/plan-pricing"
import { getTrackLimit } from "@/lib/subscription-plans"

/** Трек учитывается в лимитах тарифа (не отклонён и не отложен). */
export function isTrackCountedForPlanEligibility(track: {
  status?: string | null
}): boolean {
  const status = (track.status || "").trim()
  return status !== "rejected" && status !== "postponed"
}

export function countTracksForPlanEligibility(
  tracks: Array<{ status?: string | null }>
): number {
  return tracks.filter(isTrackCountedForPlanEligibility).length
}

export function countArtistsForPlanEligibility(
  tracks: Array<{ status?: string | null; artistName?: string | null }>
): number {
  const names = new Set<string>()
  for (const track of tracks) {
    if (!isTrackCountedForPlanEligibility(track)) continue
    const norm = normalizeArtistForPolicy(track.artistName ?? "")
    if (norm) names.add(norm)
  }
  return names.size
}

/**
 * Запрет покупки Start/Medium/Pro по уже загруженным трекам/артистам.
 * Label без ограничений. Fix оформляется отдельным пакетом.
 * extra_slot не проверяется здесь.
 */
export function getSubscriptionPlanPurchaseBlockReason(
  planId: PlanId,
  tracks: Array<{ status?: string | null; artistName?: string | null }>
): string | null {
  if (planId === "label") return null

  const trackCount = countTracksForPlanEligibility(tracks)
  const artistCount = countArtistsForPlanEligibility(tracks)
  const planName = planIdToSubscriptionName(planId)
  const trackLimit = getTrackLimit(planName)

  if (planId === "start" || planId === "medium") {
    if (trackLimit == null) return null
    if (trackCount > trackLimit) {
      return (
        `Тариф ${planName} - до ${trackLimit} треков. Сейчас в кабинете ${trackCount}` +
        ` (отклонённые и отложенные не считаются). Выберите тариф с большим лимитом, Label или Fix.`
      )
    }
    return null
  }

  if (planId === "pro" && artistCount > 1) {
    return (
      `Тариф Pro - один артист. Сейчас в кабинете ${artistCount} артиста/ов` +
      ` (по действующим трекам). Для нескольких артистов выберите Label.`
    )
  }

  return null
}
