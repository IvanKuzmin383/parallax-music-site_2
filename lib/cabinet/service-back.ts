/**
 * Куда вести «Назад» со страницы услуги.
 * design/ai/protect открываются из Инструментов, остальные - из Продвижения.
 * Загрузка видеоклипа - из Дистрибуции → Видеоклипы.
 */

export type CabinetServiceBackHref =
  | "/cabinet/tools"
  | "/cabinet/promotion"
  | "/cabinet/distribution/music-video"

export function getCabinetServiceHubHref(
  pathname: string | null | undefined
): CabinetServiceBackHref {
  const path = pathname?.trim() || ""
  if (
    path === "/cabinet/distribution/music-video/upload" ||
    path.startsWith("/cabinet/distribution/music-video/upload/") ||
    path === "/cabinet/design/music-video" ||
    path.startsWith("/cabinet/design/music-video/")
  ) {
    return "/cabinet/distribution/music-video"
  }
  if (
    path.startsWith("/cabinet/design/") ||
    path.startsWith("/cabinet/ai/") ||
    path.startsWith("/cabinet/protect/")
  ) {
    return "/cabinet/tools"
  }
  return "/cabinet/promotion"
}

export function getCabinetServiceHubBackLabel(
  href: CabinetServiceBackHref | string,
  promotionLabel: string
): string {
  if (href === "/cabinet/distribution/music-video") {
    return "Назад к видеоклипам"
  }
  if (href === "/cabinet/tools") return "Назад к инструментам"
  return promotionLabel
}
