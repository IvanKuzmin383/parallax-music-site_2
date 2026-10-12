/**
 * Куда вести «Назад» со страницы услуги.
 * design/ai/protect открываются из Инструментов, остальные - из Продвижения.
 * Загрузка видеоклипа - из Дистрибуции → Видеоклипы.
 */

export type CabinetServiceBackHref =
  | "/cabinet/tools"
  | "/cabinet/promotion"
  | "/cabinet/music/distribution?tab=videos"

export function getCabinetServiceHubHref(
  pathname: string | null | undefined
): CabinetServiceBackHref {
  const path = pathname?.trim() || ""
  if (
    path === "/cabinet/design/music-video" ||
    path.startsWith("/cabinet/design/music-video/")
  ) {
    return "/cabinet/music/distribution?tab=videos"
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
  if (href === "/cabinet/music/distribution?tab=videos") {
    return "Назад к видеоклипам"
  }
  if (href === "/cabinet/tools") return "Назад к инструментам"
  return promotionLabel
}
