/** Клиентские хелперы гейта загрузки - без DB/pg (можно импортировать в "use client"). */

/** Сообщение при попытке загрузки без активного artist-slot / Fix. */
export const UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED =
  "Для загрузки треков необходима активная подписка."

/** Блок из-за тарифа/слотов (не профиль) - открываем paywall. */
export function isUploadSubscriptionPaywallReason(reason: string): boolean {
  const t = reason.trim().toLowerCase()
  if (!t) return true
  if (t.includes("профиль")) return false
  if (t.includes("подписк") || t.includes("тариф") || t.includes("слот")) return true
  return t === UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED.toLowerCase()
}

export function isArtistSubscriptionSlotActive(
  expiresAt: string | null | undefined,
  now = new Date()
): boolean {
  if (!expiresAt) return false
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return new Date(expiresAt) >= today
}

/** Клиентская проверка по ответу GET /api/cabinet/user. */
export function getClientUploadSubscriptionBlockReason(user: {
  subscriptionName?: string | null
  artistSubscriptions?: Array<{ subscriptionExpiresAt?: string | null }>
} | null | undefined): string | null {
  if (!user) return UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED
  if (user.subscriptionName === "Fix") return null
  const slots = user.artistSubscriptions ?? []
  if (slots.some((s) => isArtistSubscriptionSlotActive(s.subscriptionExpiresAt))) {
    return null
  }
  return UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED
}
