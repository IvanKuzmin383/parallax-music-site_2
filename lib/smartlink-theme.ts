import {
  PLATFORM_ICON_SRC,
  SMARTLINK_PLATFORMS,
  isPlatformLinkKey,
  platformLabel,
  type PlatformLinkKey,
  type PlatformLinks,
} from "@/lib/smartlink-platforms"
import {
  DEFAULT_SMARTLINK_SOCIALS,
  parseSmartlinkSocials,
  type SmartlinkSocials,
} from "@/lib/smartlink-socials"

export const SMARTLINK_PRESETS = ["ink", "blur", "sheet", "signal", "glass"] as const
export type SmartlinkPreset = (typeof SMARTLINK_PRESETS)[number]

export const SMARTLINK_BUTTON_STYLES = ["solid", "outline", "soft", "glass"] as const
export type SmartlinkButtonStyle = (typeof SMARTLINK_BUTTON_STYLES)[number]

export const SMARTLINK_COVER_SHAPES = ["rounded", "soft", "square"] as const
export type SmartlinkCoverShape = (typeof SMARTLINK_COVER_SHAPES)[number]

/** Системные стеки - без внешних веб-шрифтов и лицензионных рисков. */
export const SMARTLINK_FONTS = ["sans", "rounded", "serif", "mono"] as const
export type SmartlinkFont = (typeof SMARTLINK_FONTS)[number]

export const SMARTLINK_ANIMATIONS = [
  "none",
  "rise",
  "fade",
  "cascade",
  "softPop",
  "slide",
] as const
export type SmartlinkAnimation = (typeof SMARTLINK_ANIMATIONS)[number]

export type SmartlinkExtraLink = {
  id: string
  label: string
  url: string
}

export type SmartlinkTheme = {
  preset: SmartlinkPreset
  accent: string
  buttons: SmartlinkButtonStyle
  buttonBorder: boolean
  buttonShadow: boolean
  cover: SmartlinkCoverShape
  coverShadow: boolean
  font: SmartlinkFont
  animation: SmartlinkAnimation
  /** 40-140, 100 = нормальная скорость */
  animationSpeed: number
  platformOrder?: PlatformLinkKey[]
  otherLabel?: string
  extraLinks?: SmartlinkExtraLink[]
  socials?: SmartlinkSocials
}

export const DEFAULT_SMARTLINK_THEME: SmartlinkTheme = {
  preset: "ink",
  accent: "#E2532F",
  buttons: "solid",
  buttonBorder: true,
  buttonShadow: false,
  cover: "rounded",
  coverShadow: true,
  font: "sans",
  animation: "rise",
  animationSpeed: 100,
  socials: { ...DEFAULT_SMARTLINK_SOCIALS, items: [] },
}

export const SMARTLINK_PRESET_META: Record<
  SmartlinkPreset,
  { label: string; description: string }
> = {
  ink: { label: "Ink", description: "Тёмный фон" },
  blur: { label: "Blur", description: "Размытая обложка" },
  sheet: { label: "Sheet", description: "Светлая карточка" },
  signal: { label: "Signal", description: "Контраст" },
  glass: { label: "Glass", description: "Стекло и blur" },
}

export const SMARTLINK_FONT_META: Record<SmartlinkFont, { label: string; stack: string }> = {
  sans: {
    label: "Sans",
    stack: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  rounded: {
    label: "Rounded",
    stack: 'ui-rounded, "Hiragino Maru Gothic ProN", system-ui, sans-serif',
  },
  serif: {
    label: "Serif",
    stack: 'ui-serif, Georgia, "Times New Roman", Times, serif',
  },
  mono: {
    label: "Mono",
    stack: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
}

export const SMARTLINK_ANIMATION_META: Record<
  SmartlinkAnimation,
  { label: string; description: string }
> = {
  none: { label: "Без анимации", description: "Сразу статичный экран" },
  rise: { label: "Подъём", description: "Мягко всплывает из глубины" },
  fade: { label: "Проявление", description: "Плавное появление из прозрачности" },
  cascade: { label: "Каскад", description: "Элементы по очереди сверху вниз" },
  softPop: { label: "Пульс", description: "Лёгкий scale с пружиной" },
  slide: { label: "Сдвиг", description: "Скольжение снизу вверх" },
}

export const SMARTLINK_ACCENT_SWATCHES = [
  "#E2532F",
  "#F5F0E8",
  "#111111",
  "#C8F542",
  "#4F8CFF",
  "#FF8A3D",
] as const

const HEX_RE = /^#([0-9a-fA-F]{6})$/
const MAX_EXTRA_LINKS = 8

export function isSmartlinkPreset(value: unknown): value is SmartlinkPreset {
  return typeof value === "string" && (SMARTLINK_PRESETS as readonly string[]).includes(value)
}

export function isSmartlinkButtonStyle(value: unknown): value is SmartlinkButtonStyle {
  return typeof value === "string" && (SMARTLINK_BUTTON_STYLES as readonly string[]).includes(value)
}

export function isSmartlinkCoverShape(value: unknown): value is SmartlinkCoverShape {
  return typeof value === "string" && (SMARTLINK_COVER_SHAPES as readonly string[]).includes(value)
}

export function isSmartlinkFont(value: unknown): value is SmartlinkFont {
  return typeof value === "string" && (SMARTLINK_FONTS as readonly string[]).includes(value)
}

export function isSmartlinkAnimation(value: unknown): value is SmartlinkAnimation {
  return typeof value === "string" && (SMARTLINK_ANIMATIONS as readonly string[]).includes(value)
}

export function normalizeAccentHex(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!HEX_RE.test(trimmed)) return null
  return trimmed.toUpperCase()
}

function sanitizePlatformOrder(value: unknown): PlatformLinkKey[] | undefined {
  if (!Array.isArray(value)) return undefined
  const seen = new Set<PlatformLinkKey>()
  const order: PlatformLinkKey[] = []
  for (const item of value) {
    if (!isPlatformLinkKey(item)) continue
    if (seen.has(item)) continue
    seen.add(item)
    order.push(item)
  }
  return order.length > 0 ? order : undefined
}

function sanitizeExtraLinks(value: unknown): SmartlinkExtraLink[] | undefined {
  if (!Array.isArray(value)) return undefined
  const links: SmartlinkExtraLink[] = []
  for (const item of value) {
    if (links.length >= MAX_EXTRA_LINKS) break
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    const id = typeof row.id === "string" && row.id.trim() ? row.id.trim() : cryptoRandomId()
    const label = typeof row.label === "string" ? row.label.trim().slice(0, 40) : ""
    const url = typeof row.url === "string" ? row.url.trim() : ""
    if (!label || !url) continue
    links.push({ id, label, url })
  }
  return links.length > 0 ? links : undefined
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8)
  }
  return `x${Math.random().toString(36).slice(2, 10)}`
}

function clampSpeed(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_SMARTLINK_THEME.animationSpeed
  return Math.min(140, Math.max(40, Math.round(n)))
}

export function parseSmartlinkTheme(raw: unknown): SmartlinkTheme {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_SMARTLINK_THEME,
      socials: { ...DEFAULT_SMARTLINK_SOCIALS, items: [] },
    }
  }
  const obj = raw as Record<string, unknown>
  const accent = normalizeAccentHex(obj.accent) ?? DEFAULT_SMARTLINK_THEME.accent
  const otherLabel =
    typeof obj.otherLabel === "string" && obj.otherLabel.trim()
      ? obj.otherLabel.trim().slice(0, 40)
      : undefined
  const socials = parseSmartlinkSocials(obj.socials)
  return {
    preset: isSmartlinkPreset(obj.preset) ? obj.preset : DEFAULT_SMARTLINK_THEME.preset,
    accent,
    buttons: isSmartlinkButtonStyle(obj.buttons) ? obj.buttons : DEFAULT_SMARTLINK_THEME.buttons,
    buttonBorder:
      typeof obj.buttonBorder === "boolean" ? obj.buttonBorder : DEFAULT_SMARTLINK_THEME.buttonBorder,
    buttonShadow:
      typeof obj.buttonShadow === "boolean" ? obj.buttonShadow : DEFAULT_SMARTLINK_THEME.buttonShadow,
    cover: isSmartlinkCoverShape(obj.cover) ? obj.cover : DEFAULT_SMARTLINK_THEME.cover,
    coverShadow:
      typeof obj.coverShadow === "boolean" ? obj.coverShadow : DEFAULT_SMARTLINK_THEME.coverShadow,
    font: isSmartlinkFont(obj.font) ? obj.font : DEFAULT_SMARTLINK_THEME.font,
    animation: isSmartlinkAnimation(obj.animation)
      ? obj.animation
      : DEFAULT_SMARTLINK_THEME.animation,
    animationSpeed: clampSpeed(obj.animationSpeed),
    platformOrder: sanitizePlatformOrder(obj.platformOrder),
    otherLabel,
    extraLinks: sanitizeExtraLinks(obj.extraLinks),
    socials,
  }
}

export function parseSmartlinkThemeJson(json: string | null | undefined): SmartlinkTheme {
  if (!json?.trim()) {
    return {
      ...DEFAULT_SMARTLINK_THEME,
      socials: { ...DEFAULT_SMARTLINK_SOCIALS, items: [] },
    }
  }
  try {
    return parseSmartlinkTheme(JSON.parse(json) as unknown)
  } catch {
    return {
      ...DEFAULT_SMARTLINK_THEME,
      socials: { ...DEFAULT_SMARTLINK_SOCIALS, items: [] },
    }
  }
}

export function serializeSmartlinkTheme(theme: SmartlinkTheme): string {
  const normalized = parseSmartlinkTheme(theme)
  const payload: SmartlinkTheme = {
    preset: normalized.preset,
    accent: normalized.accent,
    buttons: normalized.buttons,
    buttonBorder: normalized.buttonBorder,
    buttonShadow: normalized.buttonShadow,
    cover: normalized.cover,
    coverShadow: normalized.coverShadow,
    font: normalized.font,
    animation: normalized.animation,
    animationSpeed: normalized.animationSpeed,
    socials: normalized.socials,
  }
  if (normalized.platformOrder?.length) payload.platformOrder = normalized.platformOrder
  if (normalized.otherLabel) payload.otherLabel = normalized.otherLabel
  if (normalized.extraLinks?.length) payload.extraLinks = normalized.extraLinks
  return JSON.stringify(payload)
}

export type SmartlinkLinkItem = {
  key: string
  label: string
  url: string
  iconSrc: string
}

export function getOrderedSmartlinkLinks(
  links: PlatformLinks | undefined,
  theme?: Pick<SmartlinkTheme, "platformOrder" | "otherLabel" | "extraLinks">,
): SmartlinkLinkItem[] {
  const order = theme?.platformOrder
  const present = SMARTLINK_PLATFORMS.filter((p) => {
    const url = links?.[p.key]
    return typeof url === "string" && url.trim().length > 0
  })

  const mapItem = (key: PlatformLinkKey): SmartlinkLinkItem | null => {
    const url = links?.[key]?.trim()
    if (!url) return null
    return {
      key,
      label: platformLabel(key, theme?.otherLabel),
      url,
      iconSrc: PLATFORM_ICON_SRC[key],
    }
  }

  const ordered: SmartlinkLinkItem[] = []
  const remaining = new Set(present.map((p) => p.key))

  if (order?.length) {
    for (const key of order) {
      const item = mapItem(key)
      if (!item) continue
      ordered.push(item)
      remaining.delete(key)
    }
  }
  for (const key of remaining) {
    const item = mapItem(key)
    if (item) ordered.push(item)
  }

  for (const extra of theme?.extraLinks ?? []) {
    ordered.push({
      key: `extra:${extra.id}`,
      label: extra.label,
      url: extra.url,
      iconSrc: PLATFORM_ICON_SRC.other,
    })
  }

  return ordered
}

export function contrastTextOnAccent(accentHex: string): "#111111" | "#FAFAFA" {
  const hex = normalizeAccentHex(accentHex) ?? DEFAULT_SMARTLINK_THEME.accent
  const r = Number.parseInt(hex.slice(1, 3), 16)
  const g = Number.parseInt(hex.slice(3, 5), 16)
  const b = Number.parseInt(hex.slice(5, 7), 16)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  return luminance > 0.62 ? "#111111" : "#FAFAFA"
}

/** Длительность анимации в ms при заданной скорости. */
export function smartlinkAnimationDurationMs(speed: number, baseMs = 700): number {
  const clamped = clampSpeed(speed)
  return Math.round(baseMs * (100 / clamped))
}
