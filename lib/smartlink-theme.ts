import {
  PLATFORM_LINK_KEYS,
  SMARTLINK_PLATFORMS,
  type PlatformLinkKey,
  type PlatformLinks,
} from "@/lib/smartlink-platforms"

export const SMARTLINK_PRESETS = ["ink", "blur", "sheet", "signal"] as const
export type SmartlinkPreset = (typeof SMARTLINK_PRESETS)[number]

export const SMARTLINK_BUTTON_STYLES = ["solid", "outline", "soft"] as const
export type SmartlinkButtonStyle = (typeof SMARTLINK_BUTTON_STYLES)[number]

export const SMARTLINK_COVER_SHAPES = ["rounded", "soft", "square"] as const
export type SmartlinkCoverShape = (typeof SMARTLINK_COVER_SHAPES)[number]

export type SmartlinkTheme = {
  preset: SmartlinkPreset
  accent: string
  buttons: SmartlinkButtonStyle
  cover: SmartlinkCoverShape
  platformOrder?: PlatformLinkKey[]
}

export const DEFAULT_SMARTLINK_THEME: SmartlinkTheme = {
  preset: "ink",
  accent: "#E2532F",
  buttons: "solid",
  cover: "rounded",
}

export const SMARTLINK_PRESET_META: Record<
  SmartlinkPreset,
  { label: string; description: string }
> = {
  ink: { label: "Ink", description: "Тёмный фон, акцент на обложке" },
  blur: { label: "Blur", description: "Фон из размытой обложки" },
  sheet: { label: "Sheet", description: "Светлая карточка" },
  signal: { label: "Signal", description: "Контрастные кнопки с акцентом" },
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

export function isSmartlinkPreset(value: unknown): value is SmartlinkPreset {
  return typeof value === "string" && (SMARTLINK_PRESETS as readonly string[]).includes(value)
}

export function isSmartlinkButtonStyle(value: unknown): value is SmartlinkButtonStyle {
  return typeof value === "string" && (SMARTLINK_BUTTON_STYLES as readonly string[]).includes(value)
}

export function isSmartlinkCoverShape(value: unknown): value is SmartlinkCoverShape {
  return typeof value === "string" && (SMARTLINK_COVER_SHAPES as readonly string[]).includes(value)
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
    if (typeof item !== "string") continue
    if (!(PLATFORM_LINK_KEYS as readonly string[]).includes(item)) continue
    const key = item as PlatformLinkKey
    if (seen.has(key)) continue
    seen.add(key)
    order.push(key)
  }
  return order.length > 0 ? order : undefined
}

export function parseSmartlinkTheme(raw: unknown): SmartlinkTheme {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SMARTLINK_THEME }
  const obj = raw as Record<string, unknown>
  const accent = normalizeAccentHex(obj.accent) ?? DEFAULT_SMARTLINK_THEME.accent
  return {
    preset: isSmartlinkPreset(obj.preset) ? obj.preset : DEFAULT_SMARTLINK_THEME.preset,
    accent,
    buttons: isSmartlinkButtonStyle(obj.buttons) ? obj.buttons : DEFAULT_SMARTLINK_THEME.buttons,
    cover: isSmartlinkCoverShape(obj.cover) ? obj.cover : DEFAULT_SMARTLINK_THEME.cover,
    platformOrder: sanitizePlatformOrder(obj.platformOrder),
  }
}

export function parseSmartlinkThemeJson(json: string | null | undefined): SmartlinkTheme {
  if (!json?.trim()) return { ...DEFAULT_SMARTLINK_THEME }
  try {
    return parseSmartlinkTheme(JSON.parse(json) as unknown)
  } catch {
    return { ...DEFAULT_SMARTLINK_THEME }
  }
}

export function serializeSmartlinkTheme(theme: SmartlinkTheme): string {
  const normalized = parseSmartlinkTheme(theme)
  const payload: SmartlinkTheme = {
    preset: normalized.preset,
    accent: normalized.accent,
    buttons: normalized.buttons,
    cover: normalized.cover,
  }
  if (normalized.platformOrder?.length) {
    payload.platformOrder = normalized.platformOrder
  }
  return JSON.stringify(payload)
}

export type SmartlinkLinkItem = {
  key: PlatformLinkKey
  label: string
  url: string
}

export function getOrderedSmartlinkLinks(
  links: PlatformLinks | undefined,
  order?: PlatformLinkKey[],
): SmartlinkLinkItem[] {
  if (!links) return []
  const present = SMARTLINK_PLATFORMS.filter((p) => {
    const url = links[p.key]
    return typeof url === "string" && url.trim().length > 0
  })
  if (!order?.length) {
    return present.map((p) => ({
      key: p.key,
      label: p.label,
      url: links[p.key]!.trim(),
    }))
  }
  const byKey = new Map(present.map((p) => [p.key, p]))
  const ordered: SmartlinkLinkItem[] = []
  for (const key of order) {
    const p = byKey.get(key)
    if (!p) continue
    ordered.push({ key: p.key, label: p.label, url: links[p.key]!.trim() })
    byKey.delete(key)
  }
  for (const p of byKey.values()) {
    ordered.push({ key: p.key, label: p.label, url: links[p.key]!.trim() })
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
