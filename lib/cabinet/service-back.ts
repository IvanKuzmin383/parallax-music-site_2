/**
 * Куда вести «Назад» со страницы услуги.
 * design/ai/protect открываются из Инструментов, остальные - из Продвижения.
 */
export function getCabinetServiceHubHref(
  pathname: string | null | undefined
): "/cabinet/tools" | "/cabinet/promotion" {
  const path = pathname?.trim() || ""
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
  href: "/cabinet/tools" | "/cabinet/promotion",
  promotionLabel: string
): string {
  if (href === "/cabinet/tools") return "Назад к инструментам"
  return promotionLabel
}
