import { normalizeArtistForPolicy } from "@/lib/artist-name-normalize"
import { getEffectiveTrackLimit, getTrackLimit } from "@/lib/subscription-plans"

type TrackLike = { artistName: string }

/** Минимальные поля слота артиста (без импорта server-only модулей). */
export type ArtistSubscriptionSlotLike = {
  subscriptionName: string
  subscriptionTrackLimit: number | null
  subscriptionExpiresAt: string | null
  artistName: string | null
}

type UserForLimit = {
  subscriptionName?: string
  subscriptionTrackLimit?: number
  purchasedTracksBalance?: number
}

export function subscriptionTrackLimitError(limit: number): string {
  return `Текущий тариф предусматривает не более ${limit} активных релизов. Чтобы загрузить больше, необходимо расширить подписку или оплатить дополнительные треки.`
}

export function isArtistSlotActive(
  expiresAt: string | null | undefined,
  now = new Date()
): boolean {
  if (!expiresAt) return false
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return new Date(expiresAt) >= today
}

export function filterActiveArtistSlots(
  slots: ArtistSubscriptionSlotLike[]
): ArtistSubscriptionSlotLike[] {
  return slots.filter((s) => isArtistSlotActive(s.subscriptionExpiresAt))
}

export function countTracksForArtist(tracks: TrackLike[], artistName: string): number {
  const norm = normalizeArtistForPolicy(artistName)
  if (!norm) return 0
  return tracks.filter((t) => normalizeArtistForPolicy(t.artistName) === norm).length
}

function sumSlotLimits(
  slots: Pick<ArtistSubscriptionSlotLike, "subscriptionName" | "subscriptionTrackLimit">[]
): number | null {
  let total = 0
  for (const slot of slots) {
    const lim = getTrackLimit(slot.subscriptionName, slot.subscriptionTrackLimit)
    if (lim === null) return null
    total += lim
  }
  return total
}

/**
 * Лимит активных релизов для конкретного исполнителя.
 * При нескольких оплаченных слотах Start/Medium/Pro каждый слот даёт свой лимит (3/6/∞).
 */
export function getEffectiveTrackLimitForArtist(
  user: UserForLimit,
  artistName: string,
  activeSlots: ArtistSubscriptionSlotLike[]
): number | null {
  if (!user.subscriptionName) return 0

  if (user.subscriptionName === "Fix") {
    return getEffectiveTrackLimit(user)
  }

  if (activeSlots.some((s) => s.subscriptionName === "Label")) {
    return null
  }

  if (activeSlots.length === 0) {
    return getEffectiveTrackLimit(user)
  }

  const artistNorm = normalizeArtistForPolicy(artistName)
  if (!artistNorm) {
    const freeSlots = activeSlots.filter((s) => !s.artistName?.trim())
    if (freeSlots.length > 0) {
      return sumSlotLimits(freeSlots)
    }
    return 0
  }

  const matchingSlots = activeSlots.filter(
    (s) => s.artistName && normalizeArtistForPolicy(s.artistName) === artistNorm
  )
  if (matchingSlots.length > 0) {
    return sumSlotLimits(matchingSlots)
  }

  const freeSlots = activeSlots.filter((s) => !s.artistName?.trim())
  if (freeSlots.length > 0) {
    return getTrackLimit(freeSlots[0].subscriptionName, freeSlots[0].subscriptionTrackLimit)
  }

  return 0
}

export function isTrackUploadWithinLimit(
  user: UserForLimit,
  artistName: string,
  existingTracks: TrackLike[],
  activeSlots: ArtistSubscriptionSlotLike[],
  tracksToAdd = 1
): { allowed: boolean; limit: number | null } {
  const limit = getEffectiveTrackLimitForArtist(user, artistName, activeSlots)
  if (limit === 0) return { allowed: false, limit: 0 }
  if (limit === null) return { allowed: true, limit: null }

  const count =
    user.subscriptionName === "Fix"
      ? existingTracks.length
      : countTracksForArtist(existingTracks, artistName)

  return { allowed: count + tracksToAdd <= limit, limit }
}

/** Можно ли загрузить хотя бы один трек (хотя бы один слот не исчерпан или есть свободный слот). */
export function canUserAddAnyTrack(
  user: UserForLimit,
  existingTracks: TrackLike[],
  activeSlots: ArtistSubscriptionSlotLike[]
): boolean {
  if (!user.subscriptionName) return false

  if (user.subscriptionName === "Fix") {
    const limit = getEffectiveTrackLimit(user)
    if (limit === 0) return false
    if (limit === null) return true
    return existingTracks.length < limit
  }

  if (activeSlots.some((s) => s.subscriptionName === "Label")) {
    return true
  }

  if (activeSlots.length === 0) {
    const limit = getEffectiveTrackLimit(user)
    if (limit === 0) return false
    if (limit === null) return true
    return existingTracks.length < limit
  }

  for (const slot of activeSlots) {
    const artist = slot.artistName?.trim()
    const slotLimit = getTrackLimit(slot.subscriptionName, slot.subscriptionTrackLimit)
    if (!artist) {
      return true
    }
    if (slotLimit === null) return true
    if (countTracksForArtist(existingTracks, artist) < slotLimit) {
      return true
    }
  }

  return false
}

/** Лимит для текста диалога (типичный лимит одного слота). */
export function getRepresentativeTrackLimitForDialog(
  user: UserForLimit,
  activeSlots: ArtistSubscriptionSlotLike[]
): number | null {
  if (user.subscriptionName === "Fix") {
    return getEffectiveTrackLimit(user)
  }
  if (activeSlots.some((s) => s.subscriptionName === "Label")) {
    return null
  }
  if (activeSlots.length === 0) {
    return getEffectiveTrackLimit(user)
  }
  const limits = activeSlots
    .map((s) => getTrackLimit(s.subscriptionName, s.subscriptionTrackLimit))
    .filter((l): l is number => l !== null)
  if (limits.length === 0) return null
  return Math.min(...limits)
}
