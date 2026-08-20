/** Нормализация секунды начала звука для TikTok. */
export function parseTiktokSoundStartSec(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null
  const n = typeof raw === "number" ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n) || n < 0) return null
  return Math.trunc(n)
}
