import type { CabinetUser } from "@/lib/cabinet-users"
import { getCabinetUserByEmail } from "@/lib/cabinet-users"
import { addFixPackCredits } from "@/lib/fix-pack-credits"
import { shouldDeductFixPackCreditsOnUpload } from "@/lib/fix-pricing-legacy"
import { setTrackFixPackCreditsCharged, type Track, type TrackStatus } from "@/lib/tracks"

export function countTracksNeedingFixPackCharge(
  tracks: Pick<Track, "fixPackCreditsCharged">[]
): number {
  return tracks.filter((t) => !t.fixPackCreditsCharged).length
}

/**
 * При смене статуса: возврат слота при отклонении.
 * При переводе в upload_pending (доработка) слот не возвращаем — повторная отправка без списания
 * (флаг fix_pack_credits_charged остаётся true; UI не должен требовать новую оплату).
 */
export async function handleFixPackCreditsOnTrackStatusChange(
  track: Track,
  newStatus: TrackStatus
): Promise<void> {
  if (track.status === newStatus) return

  const user = await getCabinetUserByEmail(track.userId)
  if (!user || !shouldDeductFixPackCreditsOnUpload(user)) return

  if (newStatus === "rejected" && track.fixPackCreditsCharged) {
    await addFixPackCredits(user.id, 1)
    await setTrackFixPackCreditsCharged(track.id, false)
  }
}

export async function deductAndMarkFixPackCreditsForTracks(
  user: Pick<CabinetUser, "id" | "subscriptionName" | "createdAt">,
  tracks: Track[]
): Promise<void> {
  if (!shouldDeductFixPackCreditsOnUpload(user)) return

  const toCharge = tracks.filter((t) => !t.fixPackCreditsCharged)
  if (toCharge.length === 0) return

  const { deductFixPackCreditsOnUpload } = await import("@/lib/fix-pack-credits")
  await deductFixPackCreditsOnUpload(user, toCharge.length)

  for (const track of toCharge) {
    await setTrackFixPackCreditsCharged(track.id, true)
  }
}
