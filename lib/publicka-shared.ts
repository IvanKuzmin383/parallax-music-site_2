/** Клиент-безопасные типы и константы Публички (БизнесЗвук). */

export const PUBLICKA_RATE_RUB = 0.01

export type PublickaPlacementStatus =
  | "pending"
  | "active"
  | "paused"
  | "rejected"

export const PUBLICKA_STATUS_LABELS: Record<PublickaPlacementStatus, string> = {
  pending: "На проверке",
  active: "В эфире",
  paused: "Приостановлен",
  rejected: "Отклонён",
}

export type PublickaPlacementView = {
  id: string
  title: string
  artist: string
  status: PublickaPlacementStatus
  trackId: string | null
  totalPlays: number
  earningsRub: number
  createdAt: string
  updatedAt: string
}

export type PublickaDailyStat = {
  date: string
  totalPlays: number
}

export type PublickaCityPlaysByDate = {
  date: string
  city: string
  plays: number
}

export type PublickaStatsResponse = {
  totalPlays: number
  earningsRub: number
  rateRub: number
  daysCount: number
  placementsCount: number
  dailyStats: PublickaDailyStat[]
  cityStatsByDate: PublickaCityPlaysByDate[]
  topTracks: Array<{ title: string; artist: string; plays: number; earningsRub: number }>
}

export function playsToEarningsRub(plays: number): number {
  const n = Math.max(0, Math.floor(plays))
  return Math.round((n * PUBLICKA_RATE_RUB + Number.EPSILON) * 100) / 100
}
