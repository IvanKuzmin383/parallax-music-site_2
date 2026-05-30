/** Фон Hero / AI-лендинга: отдаётся из /public без /_next/image (Sharp на сервере). */
export const HERO_BACKGROUND = {
  webp: "/hero-studio.webp",
  jpg: "/music-studio-recording-session-dark-moody-atmosphe.jpg",
} as const

/** URL для Open Graph / schema (JPG — максимальная совместимость). */
export function getHeroBackgroundOgUrl(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "")
  return `${base}${HERO_BACKGROUND.jpg}`
}
