/** Публичные каналы связи Parallax (для кнопок консультации). */

export const PARALLAX_TELEGRAM_URL = "https://t.me/parallaxmusic_rt"
export const PARALLAX_VK_URL = "https://vk.com/parallaxmusic_releaseteam"

/**
 * Ссылка на чат в мессенджере Макс.
 * Можно переопределить через NEXT_PUBLIC_MAX_URL.
 */
export function getParallaxMaxUrl(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_MAX_URL?.trim()
  return fromEnv || null
}

export function parallaxTelegramConsultHref(prefill?: string): string {
  if (!prefill?.trim()) return PARALLAX_TELEGRAM_URL
  return `${PARALLAX_TELEGRAM_URL}?text=${encodeURIComponent(prefill.trim())}`
}
