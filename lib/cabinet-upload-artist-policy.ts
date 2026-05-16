import type { CabinetUser } from "@/lib/cabinet-users"
import {
  claimArtistForActiveSlot,
  listActiveCabinetArtistSubscriptionsByUserId,
} from "@/lib/cabinet-artist-subscriptions"

/** Сравнение имён исполнителя для политики «один артист на тарифе» */
export function normalizeArtistForPolicy(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Явные признаки нескольких исполнителей в одном поле (feat., соавторы и т. п.).
 * На тарифе Label не применяется.
 */
export function looksLikeMultiplePerformersInArtistField(artistName: string): boolean {
  const s = artistName.trim()
  if (!s) return false
  const patterns = [
    /\bfeat\.?\b/i,
    /\bft\.?\b/i,
    /\bfeaturing\b/i,
    /\bff\.?\b/i,
    /\s&\s/,
    /\s[×x]\s/i,
    /\s\/\s/,
    /\sи\s/,
    /\s\+\s/,
    /\s vs\.?\s/i,
    /при участии/i,
    /\bcollab\b/i,
    /\bw\/\s/i,
  ]
  return patterns.some((re) => re.test(s))
}

/**
 * Для всех тарифов кроме Label: один исполнитель на кабинет
 * (совпадает с уже загруженными релизами или с артистом в профиле, если релизов ещё нет).
 */
export function getUploadArtistPolicyViolation(
  user: Pick<CabinetUser, "subscriptionName" | "artistName">,
  incomingArtistName: string,
  existingTracks: { artistName: string }[]
): string | null {
  if (user.subscriptionName === "Label") return null

  const incomingNorm = normalizeArtistForPolicy(incomingArtistName)
  if (!incomingNorm) return null

  if (looksLikeMultiplePerformersInArtistField(incomingArtistName)) {
    return (
      "На вашем тарифе в поле «Исполнитель» указывается один артист, без совместных релизов " +
      "(без feat., ft., &, приглашённых исполнителей и т. п.). На тарифе Label это разрешено."
    )
  }

  const normFromTrack = (t: { artistName: string }) => normalizeArtistForPolicy(t.artistName)
  const distinct = new Set(
    existingTracks.map(normFromTrack).filter((n) => n.length > 0)
  )

  if (distinct.size > 1) {
    return (
      "В кабинете уже есть релизы под разными исполнителями. На текущем тарифе допустим один исполнитель " +
      "на все релизы. Обратитесь в поддержку или перейдите на тариф Label."
    )
  }

  if (distinct.size === 1) {
    const canonicalNorm = [...distinct][0]
    if (incomingNorm !== canonicalNorm) {
      const display =
        existingTracks.find((t) => normFromTrack(t) === canonicalNorm)?.artistName ?? incomingArtistName.trim()
      return (
        `На вашем тарифе все релизы должны быть на одного исполнителя, как в уже загруженных треках: «${display}». ` +
        "Несколько разных исполнителей доступны на тарифе Label."
      )
    }
    return null
  }

  const profile = user.artistName?.trim()
  if (profile && incomingNorm !== normalizeArtistForPolicy(profile)) {
    return (
      `На вашем тарифе исполнитель релиза должен совпадать с артистом в профиле: «${profile}». ` +
      "Работа под разными именами исполнителя доступна на тарифе Label."
    )
  }

  return null
}

export async function getUploadArtistPolicyViolationWithSlots(
  user: Pick<CabinetUser, "id" | "subscriptionName">,
  incomingArtistName: string
): Promise<string | null> {
  const incomingNorm = normalizeArtistForPolicy(incomingArtistName)
  if (!incomingNorm) return "Укажите исполнителя"

  const activeSlots = await listActiveCabinetArtistSubscriptionsByUserId(user.id)
  // Для тарифа Fix загрузка возможна без artist-slot подписок:
  // лимиты треков контролируются отдельной проверкой getEffectiveTrackLimit.
  if (user.subscriptionName === "Fix") {
    return null
  }
  if (activeSlots.length === 0) {
    return "Для загрузки треков необходима активная подписка."
  }

  const hasLabelSlot = activeSlots.some((s) => s.subscriptionName === "Label")
  if (hasLabelSlot) return null

  if (looksLikeMultiplePerformersInArtistField(incomingArtistName)) {
    return (
      "На вашем тарифе в поле «Исполнитель» указывается один артист, без совместных релизов " +
      "(без feat., ft., &, приглашённых исполнителей и т. п.). На тарифе Label это разрешено."
    )
  }

  const assigned = activeSlots.filter((s) => s.artistName && s.artistName.trim().length > 0)
  const hasArtistAssigned = assigned.some(
    (s) => normalizeArtistForPolicy(s.artistName ?? "") === incomingNorm
  )
  if (hasArtistAssigned) return null

  const claimed = await claimArtistForActiveSlot(user.id, incomingArtistName)
  if (claimed) return null

  const artistList = assigned.map((s) => `«${s.artistName}»`).join(", ")
  return artistList
    ? `Доступные слоты артистов по вашим подпискам уже заняты: ${artistList}. Оплатите дополнительный тариф или используйте тариф Label.`
    : "Доступных слотов артистов по вашим подпискам нет. Оплатите дополнительный тариф или используйте тариф Label."
}
