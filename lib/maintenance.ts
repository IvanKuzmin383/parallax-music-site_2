/** Флаг техработ. Включается через MAINTENANCE_MODE=1 (или true/on/yes) в .env. */
export function isMaintenanceModeEnabled(
  value: string | undefined = process.env.MAINTENANCE_MODE
): boolean {
  const v = value?.trim().toLowerCase()
  return v === "1" || v === "true" || v === "on" || v === "yes"
}

export const MAINTENANCE_BYPASS_COOKIE = "maintenance_bypass"
export const MAINTENANCE_BYPASS_QUERY = "maintenance_bypass"

/** Секрет для обхода техработ (cookie / query). Пустой = bypass выключен. */
export function getMaintenanceBypassSecret(): string {
  return process.env.MAINTENANCE_BYPASS_SECRET?.trim() || ""
}

/** Retry-After в секундах (по умолчанию 1 час). */
export function getMaintenanceRetryAfterSeconds(): string {
  const raw = process.env.MAINTENANCE_RETRY_AFTER?.trim()
  if (raw && /^\d+$/.test(raw)) return raw
  return "3600"
}
