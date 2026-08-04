import { isSubscriptionActiveForUpload } from "@/lib/subscription-plans"

/** Истёкшая подписка (не Fix): блокируем только загрузку, остальной кабинет доступен. */
export function isCabinetSubscriptionExpiredForNavigation(user: {
  subscriptionName?: string
  subscriptionExpiresAt?: string
} | null | undefined): boolean {
  if (!user?.subscriptionName || user.subscriptionName === "Fix") return false
  return !isSubscriptionActiveForUpload({
    subscriptionName: user.subscriptionName,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
  })
}

/**
 * Маршруты, доступные при истёкшей подписке.
 * Закрыта только загрузка трека/альбома; статистика, финансы, профиль, услуги — открыты.
 */
export function isCabinetPathAllowedWhenSubscriptionExpired(pathname: string): boolean {
  if (pathname === "/cabinet/upload" || pathname.startsWith("/cabinet/upload/")) {
    return false
  }
  return true
}
