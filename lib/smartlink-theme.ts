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

/** Базовые + характерные пресеты. Ключи ink/blur/... сохранены для совместимости. */
export const SMARTLINK_PRESETS = [
  "ink",
  "blur",
  "sheet",
  "signal",
  "glass",
  "neon",
  "film",
  "ticket",
  "vinyl",
  "terminal",
  "poster",
  "inkblot",
  "carbon",
  "sunset",
  "cinema",
  "capsule",
  "grid",
] as const
export type SmartlinkPreset = (typeof SMARTLINK_PRESETS)[number]

/** Спокойные базовые - первыми в сетке редактора. */
export const SMARTLINK_PRESET_BASE = ["ink", "blur", "sheet", "signal", "glass"] as const
export const SMARTLINK_PRESET_SIGNATURE = [
  "neon",
  "film",
  "ticket",
  "vinyl",
  "terminal",
  "poster",
  "inkblot",
  "carbon",
  "sunset",
  "cinema",
  "capsule",
  "grid",
] as const

export const SMARTLINK_BUTTON_STYLES = ["solid", "outline", "soft", "glass", "bare"] as const
export type SmartlinkButtonStyle = (typeof SMARTLINK_BUTTON_STYLES)[number]

export const SMARTLINK_COVER_SHAPES = ["rounded", "soft", "square"] as const
export type SmartlinkCoverShape = (typeof SMARTLINK_COVER_SHAPES)[number]

/** Системные стеки - без внешних веб-шрифтов и лицензионных рисков. */
export const SMARTLINK_FONTS = ["sans", "rounded", "serif", "mono"] as const
export type SmartlinkFont = (typeof SMARTLINK_FONTS)[number]

export const SMARTLINK_PLATFORM_LAYOUTS = ["list", "icons"] as const
export type SmartlinkPlatformLayout = (typeof SMARTLINK_PLATFORM_LAYOUTS)[number]

export const SMARTLINK_ANIMATIONS = [
  "none",
  "rise",
  "fade",
  "cascade",
  "softPop",
  "slide",
  "hail",
  "popGrid",
] as const
export type SmartlinkAnimation = (typeof SMARTLINK_ANIMATIONS)[number]

export type SmartlinkExtraLink = {
  id: string
  label: string
  url: string
}

/** Длина публичного хука на смартлинке (секунды). Не полный трек. */
export const SMARTLINK_PREVIEW_AUDIO_DURATION_SEC = 25
export const SMARTLINK_PREVIEW_AUDIO_START_MAX = 600

export type SmartlinkTheme = {
  preset: SmartlinkPreset
  accent: string
  buttons: SmartlinkButtonStyle
  buttonBorder: boolean
  buttonShadow: boolean
  cover: SmartlinkCoverShape
  coverShadow: boolean
  font: SmartlinkFont
  /** list - кнопки с подписями; icons - только значки сеткой */
  platformLayout: SmartlinkPlatformLayout
  animation: SmartlinkAnimation
  /** 8-140, 100 = нормальная скорость; ниже 40 - заметно медленнее */
  animationSpeed: number
  /** Автопревью хука на публичной странице (короткий mp3, не полный WAV). */
  previewAudioEnabled: boolean
  /** Секунда старта хука в исходном треке. */
  previewAudioStartSec: number
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
  platformLayout: "list",
  animation: "rise",
  animationSpeed: 100,
  previewAudioEnabled: false,
  previewAudioStartSec: 0,
  socials: { ...DEFAULT_SMARTLINK_SOCIALS, items: [] },
}

export const SMARTLINK_PRESET_META: Record<
  SmartlinkPreset,
  { label: string; description: string }
> = {
  ink: { label: "Уголь", description: "Тёмный спокойный фон" },
  blur: { label: "Фокус", description: "Размытая обложка на фоне" },
  sheet: { label: "Лист", description: "Светлая карточка" },
  signal: { label: "Контраст", description: "Жёсткие блоки и акцент" },
  glass: { label: "Иней", description: "Полупрозрачное стекло" },
  neon: { label: "Неон", description: "Обводка и свечение акцента" },
  film: { label: "Плёнка", description: "Зерно и матовые стикеры" },
  ticket: { label: "Билет", description: "Перфорация и штамп LISTEN" },
  vinyl: { label: "Винил", description: "Круглые значки вокруг обложки" },
  terminal: { label: "Терминал", description: "Mono-список со стрелками" },
  poster: { label: "Постер", description: "Крупный заголовок на обложке" },
  inkblot: { label: "Чернила", description: "Кляксы в цветах площадок" },
  carbon: { label: "Карбон", description: "Диагональная сетка, мат" },
  sunset: { label: "Закат", description: "Градиент акцент → чёрный" },
  cinema: { label: "Кино", description: "Letterbox и широкие кнопки" },
  capsule: { label: "Капсула", description: "Вытянутые pills со стрелкой" },
  grid: { label: "Сетка", description: "Значки в тонких рамках" },
}

/** Рекомендуемые поля при выборе пресета в редакторе. */
export type SmartlinkPresetLook = Pick<
  SmartlinkTheme,
  "buttons" | "buttonBorder" | "buttonShadow" | "cover" | "coverShadow" | "font" | "platformLayout"
>

export const SMARTLINK_PRESET_LOOK: Record<SmartlinkPreset, SmartlinkPresetLook> = {
  ink: {
    buttons: "solid",
    buttonBorder: true,
    buttonShadow: false,
    cover: "rounded",
    coverShadow: true,
    font: "sans",
    platformLayout: "list",
  },
  blur: {
    buttons: "soft",
    buttonBorder: false,
    buttonShadow: true,
    cover: "soft",
    coverShadow: true,
    font: "sans",
    platformLayout: "list",
  },
  sheet: {
    buttons: "solid",
    buttonBorder: false,
    buttonShadow: false,
    cover: "rounded",
    coverShadow: true,
    font: "serif",
    platformLayout: "list",
  },
  signal: {
    buttons: "solid",
    buttonBorder: true,
    buttonShadow: false,
    cover: "square",
    coverShadow: false,
    font: "sans",
    platformLayout: "list",
  },
  glass: {
    buttons: "glass",
    buttonBorder: true,
    buttonShadow: false,
    cover: "soft",
    coverShadow: true,
    font: "rounded",
    platformLayout: "list",
  },
  neon: {
    buttons: "outline",
    buttonBorder: true,
    buttonShadow: true,
    cover: "rounded",
    coverShadow: true,
    font: "sans",
    platformLayout: "list",
  },
  film: {
    buttons: "soft",
    buttonBorder: false,
    buttonShadow: true,
    cover: "soft",
    coverShadow: true,
    font: "serif",
    platformLayout: "list",
  },
  ticket: {
    buttons: "outline",
    buttonBorder: true,
    buttonShadow: false,
    cover: "square",
    coverShadow: false,
    font: "mono",
    platformLayout: "list",
  },
  vinyl: {
    buttons: "solid",
    buttonBorder: false,
    buttonShadow: true,
    cover: "soft",
    coverShadow: true,
    font: "sans",
    platformLayout: "icons",
  },
  terminal: {
    buttons: "outline",
    buttonBorder: false,
    buttonShadow: false,
    cover: "square",
    coverShadow: false,
    font: "mono",
    platformLayout: "list",
  },
  poster: {
    buttons: "solid",
    buttonBorder: false,
    buttonShadow: true,
    cover: "square",
    coverShadow: false,
    font: "sans",
    platformLayout: "list",
  },
  inkblot: {
    buttons: "solid",
    buttonBorder: false,
    buttonShadow: false,
    cover: "soft",
    coverShadow: true,
    font: "rounded",
    platformLayout: "list",
  },
  carbon: {
    buttons: "soft",
    buttonBorder: true,
    buttonShadow: false,
    cover: "rounded",
    coverShadow: true,
    font: "sans",
    platformLayout: "list",
  },
  sunset: {
    buttons: "solid",
    buttonBorder: false,
    buttonShadow: true,
    cover: "rounded",
    coverShadow: true,
    font: "sans",
    platformLayout: "list",
  },
  cinema: {
    buttons: "solid",
    buttonBorder: false,
    buttonShadow: false,
    cover: "square",
    coverShadow: false,
    font: "sans",
    platformLayout: "list",
  },
  capsule: {
    buttons: "solid",
    buttonBorder: false,
    buttonShadow: true,
    cover: "soft",
    coverShadow: true,
    font: "rounded",
    platformLayout: "list",
  },
  grid: {
    buttons: "outline",
    buttonBorder: true,
    buttonShadow: false,
    cover: "rounded",
    coverShadow: true,
    font: "sans",
    platformLayout: "icons",
  },
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

export const SMARTLINK_PLATFORM_LAYOUT_META: Record<
  SmartlinkPlatformLayout,
  { label: string; description: string }
> = {
  list: { label: "Список", description: "Иконка и название" },
  icons: { label: "Значки", description: "Только иконки сеткой" },
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
  hail: { label: "Град", description: "Иконки падают сверху с отскоком" },
  popGrid: { label: "Мозаика", description: "Значки по очереди вспыхивают" },
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

export function isSmartlinkPlatformLayout(value: unknown): value is SmartlinkPlatformLayout {
  return (
    typeof value === "string" && (SMARTLINK_PLATFORM_LAYOUTS as readonly string[]).includes(value)
  )
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

export const SMARTLINK_ANIM_SPEED_MIN = 8
export const SMARTLINK_ANIM_SPEED_MAX = 140

function clampSpeed(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_SMARTLINK_THEME.animationSpeed
  return Math.min(SMARTLINK_ANIM_SPEED_MAX, Math.max(SMARTLINK_ANIM_SPEED_MIN, Math.round(n)))
}

function clampPreviewStartSec(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(n)) return DEFAULT_SMARTLINK_THEME.previewAudioStartSec
  return Math.min(SMARTLINK_PREVIEW_AUDIO_START_MAX, Math.max(0, Math.trunc(n)))
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
    platformLayout: isSmartlinkPlatformLayout(obj.platformLayout)
      ? obj.platformLayout
      : DEFAULT_SMARTLINK_THEME.platformLayout,
    animation: isSmartlinkAnimation(obj.animation)
      ? obj.animation
      : DEFAULT_SMARTLINK_THEME.animation,
    animationSpeed: clampSpeed(obj.animationSpeed),
    previewAudioEnabled:
      typeof obj.previewAudioEnabled === "boolean"
        ? obj.previewAudioEnabled
        : DEFAULT_SMARTLINK_THEME.previewAudioEnabled,
    previewAudioStartSec: clampPreviewStartSec(obj.previewAudioStartSec),
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
    platformLayout: normalized.platformLayout,
    animation: normalized.animation,
    animationSpeed: normalized.animationSpeed,
    previewAudioEnabled: normalized.previewAudioEnabled,
    previewAudioStartSec: normalized.previewAudioStartSec,
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

/** Длительность анимации в ms при заданной скорости. 8% ≈ 18с, 100% ≈ 0.9с */
export function smartlinkAnimationDurationMs(speed: number, baseMs = 900): number {
  const clamped = clampSpeed(speed)
  const slowBoost = clamped < 40 ? 1 + (40 - clamped) / 50 : 1
  return Math.round(baseMs * (100 / clamped) * slowBoost)
}

export function isLightSmartlinkPreset(preset: SmartlinkPreset): boolean {
  return preset === "sheet"
}
