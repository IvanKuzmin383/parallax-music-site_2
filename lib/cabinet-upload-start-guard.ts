"use client"

import {
  getClientUploadSubscriptionBlockReason,
  UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED,
} from "@/lib/cabinet-upload-subscription-gate"

type UserUploadGate = {
  profileCompleteForUpload?: boolean
  canUploadRelease?: boolean
  uploadBlockReason?: string | null
  subscriptionName?: string | null
  artistSubscriptions?: Array<{ subscriptionExpiresAt?: string | null }>
}

/**
 * Проверка перед переходом на /cabinet/upload.
 * @returns текст ошибки или null если можно открывать визард.
 */
export async function getReleaseUploadStartBlockReason(): Promise<string | null> {
  try {
    const res = await fetch("/api/cabinet/user", { credentials: "include" })
    if (!res.ok) return UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED
    const data = (await res.json()) as { user?: UserUploadGate }
    const user = data.user
    if (!user) return UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED
    if (user.profileCompleteForUpload === false) {
      return "Заполните обязательные поля в профиле, чтобы загрузить релиз"
    }
    if (typeof user.canUploadRelease === "boolean") {
      return user.canUploadRelease
        ? null
        : user.uploadBlockReason?.trim() || UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED
    }
    return getClientUploadSubscriptionBlockReason(user)
  } catch {
    return UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED
  }
}
