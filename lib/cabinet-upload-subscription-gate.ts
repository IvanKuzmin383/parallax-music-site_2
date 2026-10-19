import type { CabinetUser } from "@/lib/cabinet-users"
import { listActiveCabinetArtistSubscriptionsByUserId } from "@/lib/cabinet-artist-subscriptions"
import { UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED } from "@/lib/cabinet-upload-subscription-client"

/** Серверная проверка (те же правила, что artist-policy без имени артиста). */
export async function getServerUploadSubscriptionBlockReason(
  user: Pick<CabinetUser, "id" | "subscriptionName">
): Promise<string | null> {
  if (user.subscriptionName === "Fix") return null
  const activeSlots = await listActiveCabinetArtistSubscriptionsByUserId(user.id)
  if (activeSlots.length === 0) return UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED
  return null
}
