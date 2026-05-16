/** Базовая (старая) цена за один дополнительный трек (тариф Fix), RUB */
export const LEGACY_TRACK_PRICE_RUB = 300

/** Цена для новых пользователей (зарегистрированных после 21.03.2026), RUB */
export const NEW_USER_TRACK_PRICE_RUB = 400

/** Пользователь считается новым, если зарегистрирован строго после 21.03.2026 */
export const NEW_USER_TRACK_PRICE_START_UTC_MS = Date.UTC(2026, 2, 22, 0, 0, 0, 0)

/** Совместимость: текущая дефолтная цена в UI без контекста пользователя */
export const TRACK_PRICE_RUB = NEW_USER_TRACK_PRICE_RUB

export function getTrackPriceRubByCreatedAt(createdAt?: string): number {
  if (!createdAt) return LEGACY_TRACK_PRICE_RUB
  const createdAtMs = Date.parse(createdAt)
  if (Number.isNaN(createdAtMs)) return LEGACY_TRACK_PRICE_RUB
  return createdAtMs >= NEW_USER_TRACK_PRICE_START_UTC_MS
    ? NEW_USER_TRACK_PRICE_RUB
    : LEGACY_TRACK_PRICE_RUB
}

/** Максимальное количество треков в одном платёже за доп. треки */
export const MAX_TRACKS_TOPUP = 50
