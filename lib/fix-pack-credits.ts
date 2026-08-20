import type { CabinetUser } from "@/lib/cabinet-users"
import {
  getCabinetUserByEmail,
  getCabinetUserById,
  updateCabinetUserPurchasedTracks,
} from "@/lib/cabinet-users"
import { shouldDeductFixPackCreditsOnUpload } from "@/lib/fix-pricing-legacy"
import type { Track } from "@/lib/tracks"

export function assertFixPackCreditsAvailable(
  user: Pick<CabinetUser, "subscriptionName" | "createdAt" | "purchasedTracksBalance" | "subscriptionTrackLimit">,
  tracksToAdd: number
): { ok: true } | { ok: false; error: string } {
  if (!shouldDeductFixPackCreditsOnUpload(user)) {
    return { ok: true }
  }
  if (tracksToAdd === 0) {
    return { ok: true }
  }
  if (!Number.isInteger(tracksToAdd) || tracksToAdd < 1) {
    return { ok: false, error: "Некорректное количество треков" }
  }
  const balance = user.purchasedTracksBalance ?? 0
  if (balance < tracksToAdd) {
    return {
      ok: false,
      error: `Недостаточно оплаченных слотов (доступно ${balance}, требуется ${tracksToAdd}). Купите пакет треков.`,
    }
  }
  return { ok: true }
}

export function assertFixPackCreditsForTracks(
  user: Pick<CabinetUser, "subscriptionName" | "createdAt" | "purchasedTracksBalance" | "subscriptionTrackLimit">,
  tracks: Pick<Track, "fixPackCreditsCharged">[]
): { ok: true } | { ok: false; error: string } {
  const needed = tracks.filter((t) => !t.fixPackCreditsCharged).length
  return assertFixPackCreditsAvailable(user, needed)
}

export async function deductFixPackCreditsOnUpload(
  user: Pick<CabinetUser, "id" | "subscriptionName" | "createdAt">,
  tracksToAdd: number
): Promise<void> {
  if (!shouldDeductFixPackCreditsOnUpload(user)) return
  if (!Number.isInteger(tracksToAdd) || tracksToAdd < 1) return
  await updateCabinetUserPurchasedTracks(user.id, -tracksToAdd)
}

export async function addFixPackCredits(userId: string, tracksCount: number): Promise<CabinetUser | null> {
  if (!Number.isInteger(tracksCount) || tracksCount < 1) return null
  return updateCabinetUserPurchasedTracks(userId, tracksCount)
}

export async function addFixPackCreditsByEmail(email: string, tracksCount: number): Promise<CabinetUser | null> {
  const { getCabinetUserByEmail } = await import("@/lib/cabinet-users")
  const user = await getCabinetUserByEmail(email)
  if (!user) return null
  return addFixPackCredits(user.id, tracksCount)
}

export async function requireFixPackCreditsForUpload(
  email: string,
  tracksToAdd: number
): Promise<{ ok: true; user: CabinetUser } | { ok: false; error: string }> {
  const user = await getCabinetUserByEmail(email)
  if (!user) return { ok: false, error: "Пользователь не найден" }
  const gate = assertFixPackCreditsAvailable(user, tracksToAdd)
  if (!gate.ok) return { ok: false, error: gate.error }
  return { ok: true, user }
}
