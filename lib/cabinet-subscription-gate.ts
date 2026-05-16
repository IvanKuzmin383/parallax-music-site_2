import { isSubscriptionActiveForUpload } from "@/lib/subscription-plans"

/** Нужно удерживать пользователя на главной /cabinet и не пускать в разделы при истёкшей подписке (не Fix). */
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

/** Маршруты, доступные при истёкшей подписке (восстановление пароля, подтверждение автопродления). */
export function isCabinetPathAllowedWhenSubscriptionExpired(pathname: string): boolean {
  if (pathname === "/cabinet") return true
  if (pathname.startsWith("/cabinet/forgot-password")) return true
  if (pathname.startsWith("/cabinet/reset-password")) return true
  if (pathname.startsWith("/cabinet/autopay/confirm")) return true
  return false
}
