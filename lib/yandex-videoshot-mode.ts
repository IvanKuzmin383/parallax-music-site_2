export type YandexVideoshotMode = "ready" | "create"

export function isYandexVideoshotMode(value: string | null | undefined): value is YandexVideoshotMode {
  return value === "ready" || value === "create"
}

export function isYandexVideoshotCreationPath(pathname: string | null | undefined): boolean {
  const path = pathname?.trim() || ""
  return (
    path.includes("/yandex-videoshot-creation") || path.includes("/video-shots-publishing")
  )
}

/** Default mode from route; query `mode` overrides when valid. */
export function resolveYandexVideoshotMode(
  pathname: string | null | undefined,
  modeParam: string | null | undefined,
): YandexVideoshotMode {
  if (isYandexVideoshotMode(modeParam)) return modeParam
  return isYandexVideoshotCreationPath(pathname) ? "create" : "ready"
}

export const VIDEO_DIRECTION_OPTIONS = [
  { value: "team", label: "Выберем вместе с командой" },
  { value: "clip", label: "Кадры из клипа" },
  { value: "graphics", label: "Графика и абстракция" },
  { value: "backstage", label: "Бэкстейдж или выступление" },
] as const

export type VideoDirectionValue = (typeof VIDEO_DIRECTION_OPTIONS)[number]["value"]

export function videoDirectionLabel(value: string): string {
  return VIDEO_DIRECTION_OPTIONS.find((o) => o.value === value)?.label ?? value
}
