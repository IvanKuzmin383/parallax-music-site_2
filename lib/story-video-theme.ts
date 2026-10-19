/** Клиентский конструктор сторис-видео: шаблоны, motion, фильтры, текст. */

export const STORY_VIDEO_WIDTH = 720
export const STORY_VIDEO_HEIGHT = 1280
export const STORY_VIDEO_FPS = 30
/** Длина по умолчанию. */
export const STORY_VIDEO_DURATION_SEC = 15
/** Минимальная / максимальная длина отрывка (сек). */
export const STORY_VIDEO_DURATION_MIN_SEC = 5
export const STORY_VIDEO_DURATION_MAX_SEC = 30
export const STORY_VIDEO_START_MAX_SEC = 600

export const STORY_VIDEO_TEMPLATES = [
  "blurPulse",
  "poster",
  "filmGrain",
  "lyricCard",
  "vinyl",
  "cassette",
  "neon",
  "noir",
  "ticket",
  "orbit",
] as const
export type StoryVideoTemplate = (typeof STORY_VIDEO_TEMPLATES)[number]

export const STORY_VIDEO_TEMPLATE_BASE = [
  "blurPulse",
  "poster",
  "filmGrain",
  "lyricCard",
] as const

export const STORY_VIDEO_TEMPLATE_SIGNATURE = [
  "vinyl",
  "cassette",
  "neon",
  "noir",
  "ticket",
  "orbit",
] as const

export const STORY_VIDEO_MOTIONS = [
  "kenBurnsIn",
  "kenBurnsOut",
  "breathe",
  "snapZoom",
] as const
export type StoryVideoMotion = (typeof STORY_VIDEO_MOTIONS)[number]

export const STORY_VIDEO_FILTERS = ["clean", "grain", "warm", "vhs"] as const
export type StoryVideoFilter = (typeof STORY_VIDEO_FILTERS)[number]

export const STORY_VIDEO_TEXT_LAYOUTS = ["titleArtist", "bigHook"] as const
export type StoryVideoTextLayout = (typeof STORY_VIDEO_TEXT_LAYOUTS)[number]

export const STORY_VIDEO_TEXT_ALIGNS = ["left", "center", "right"] as const
export type StoryVideoTextAlign = (typeof STORY_VIDEO_TEXT_ALIGNS)[number]

/** Бейджи «слушайте на…» - можно выбрать несколько, рисуются сеткой по 2 в ряд. */
export const STORY_VIDEO_BADGE_IDS = ["spotify", "appleMusic", "yandex", "vk"] as const
export type StoryVideoBadgeId = (typeof STORY_VIDEO_BADGE_IDS)[number]

/** @deprecated use StoryVideoBadgeId; оставлен для совместимости импортов */
export type StoryVideoBadge = StoryVideoBadgeId | "none"

export const STORY_VIDEO_BADGE_META: Record<
  StoryVideoBadgeId,
  { label: string; line1: string; line2: string; iconSrc: string }
> = {
  spotify: {
    label: "Spotify",
    line1: "Listen on",
    line2: "Spotify",
    iconSrc: "/platforms/spotify.svg",
  },
  appleMusic: {
    label: "Apple Music",
    line1: "Listen on",
    line2: "MUSIC",
    iconSrc: "/platforms/apple-music.svg",
  },
  yandex: {
    label: "Яндекс Музыка",
    line1: "Послушайте на",
    line2: "Яндекс Музыке",
    iconSrc: "/platforms/yandex.svg",
  },
  vk: {
    label: "VK",
    line1: "Слушайте",
    line2: "ВКонтакте",
    iconSrc: "/platforms/vk.svg?v=2",
  },
}

/** Старый список с "none" - для UI больше не нужен, оставлен пустым алиасом. */
export const STORY_VIDEO_BADGES = STORY_VIDEO_BADGE_IDS

/** Быстрые точки для сетки 3×3 (проценты кадра). */
export const STORY_VIDEO_TEXT_POSITION_PRESETS: Array<{
  id: string
  label: string
  textX: number
  textY: number
  textAlign: StoryVideoTextAlign
}> = [
  { id: "tl", label: "↖", textX: 12, textY: 14, textAlign: "left" },
  { id: "tc", label: "↑", textX: 50, textY: 14, textAlign: "center" },
  { id: "tr", label: "↗", textX: 88, textY: 14, textAlign: "right" },
  { id: "ml", label: "←", textX: 12, textY: 48, textAlign: "left" },
  { id: "mc", label: "·", textX: 50, textY: 48, textAlign: "center" },
  { id: "mr", label: "→", textX: 88, textY: 48, textAlign: "right" },
  { id: "bl", label: "↙", textX: 12, textY: 82, textAlign: "left" },
  { id: "bc", label: "↓", textX: 50, textY: 82, textAlign: "center" },
  { id: "br", label: "↘", textX: 88, textY: 82, textAlign: "right" },
]

export type StoryVideoProject = {
  template: StoryVideoTemplate
  motion: StoryVideoMotion
  filter: StoryVideoFilter
  textLayout: StoryVideoTextLayout
  /** Горизонталь якоря текста, 0-100 (% ширины кадра). */
  textX: number
  /** Вертикаль якоря текста, 0-100 (% высоты кадра). */
  textY: number
  textAlign: StoryVideoTextAlign
  title: string
  artist: string
  hookText: string
  /** Акцент текста (артист, линия под хуком) и мелкий декор шаблонов. */
  accent: string
  /** Цвет рамки / обводки обложки (Neon и т.п.). */
  frameColor: string
  /** Рисовать рамку вокруг обложки / акцентную полосу шаблона. */
  showFrame: boolean
  /** Цвет активных полос waveform. */
  waveformColor: string
  startSec: number
  /** Длина отрывка, сек (5-30). */
  durationSec: number
  motionSpeed: number
  showWaveform: boolean
  /** Рисовать title/artist или big hook. */
  showText: boolean
  /** Акцентная линия под текстом (Big Hook / Lyric Card). */
  showTextLine: boolean
  /** Выбранные бейджи площадок (порядок = сверху вниз). */
  badges: StoryVideoBadgeId[]
  /** Горизонталь якоря блока бейджей, 0-100. */
  badgeX: number
  /** Вертикаль якоря блока бейджей (центр стопки), 0-100. */
  badgeY: number
}

export const DEFAULT_STORY_VIDEO_PROJECT: StoryVideoProject = {
  template: "blurPulse",
  motion: "kenBurnsIn",
  filter: "clean",
  textLayout: "titleArtist",
  textX: 12,
  textY: 82,
  textAlign: "left",
  title: "Название трека",
  artist: "Имя артиста",
  hookText: "Слушай сейчас",
  accent: "#E2532F",
  frameColor: "#E2532F",
  showFrame: false,
  waveformColor: "#E2532F",
  startSec: 0,
  durationSec: STORY_VIDEO_DURATION_SEC,
  motionSpeed: 100,
  showWaveform: false,
  showText: true,
  showTextLine: true,
  badges: [],
  badgeX: 50,
  badgeY: 88,
}

export const STORY_VIDEO_TEMPLATE_META: Record<
  StoryVideoTemplate,
  { label: string; description: string }
> = {
  blurPulse: { label: "Blur Pulse", description: "Размытый фон и обложка по центру" },
  poster: { label: "Poster", description: "Обложка почти на весь кадр" },
  filmGrain: { label: "Film Grain", description: "Кино, letterbox и зерно" },
  lyricCard: { label: "Lyric Card", description: "Цитата/хук крупно, обложка по центру" },
  vinyl: { label: "Vinyl", description: "Круглая обложка и виниловый вайб" },
  cassette: { label: "Кассета", description: "Обложка на корпусе, крутящиеся катушки" },
  neon: { label: "Neon", description: "Тёмный фон и свечение акцента" },
  noir: { label: "Noir", description: "Ч/б с одной цветной линией" },
  ticket: { label: "Ticket", description: "Билет LISTEN NOW" },
  orbit: { label: "Orbit", description: "Кольца вокруг обложки" },
}

export const STORY_VIDEO_MOTION_META: Record<
  StoryVideoMotion,
  { label: string; description: string }
> = {
  kenBurnsIn: { label: "Ken Burns In", description: "Медленный наезд" },
  kenBurnsOut: { label: "Ken Burns Out", description: "Медленный отъезд" },
  breathe: { label: "Breathe", description: "Мягкая пульсация" },
  snapZoom: { label: "Snap Zoom", description: "Резкий зум на 0, 5 и 10 сек" },
}

export const STORY_VIDEO_FILTER_META: Record<
  StoryVideoFilter,
  { label: string; description: string }
> = {
  clean: { label: "Clean", description: "Без обработки" },
  grain: { label: "Grain", description: "Кинозерно" },
  warm: { label: "Warm", description: "Тёплый оттенок" },
  vhs: { label: "VHS", description: "Scanlines и лёгкий сдвиг" },
}

export const STORY_VIDEO_TEXT_LAYOUT_META: Record<
  StoryVideoTextLayout,
  { label: string; description: string }
> = {
  titleArtist: { label: "Title / Artist", description: "Название и артист" },
  bigHook: { label: "Big Hook", description: "Одна крупная фраза" },
}

export type StoryVideoTemplateLook = Pick<
  StoryVideoProject,
  "motion" | "filter" | "textLayout" | "showWaveform"
>

export const STORY_VIDEO_TEMPLATE_LOOK: Record<StoryVideoTemplate, StoryVideoTemplateLook> = {
  blurPulse: { motion: "breathe", filter: "clean", textLayout: "titleArtist", showWaveform: false },
  poster: { motion: "kenBurnsIn", filter: "warm", textLayout: "titleArtist", showWaveform: false },
  filmGrain: { motion: "kenBurnsOut", filter: "grain", textLayout: "titleArtist", showWaveform: false },
  lyricCard: { motion: "kenBurnsIn", filter: "clean", textLayout: "bigHook", showWaveform: false },
  vinyl: { motion: "kenBurnsIn", filter: "warm", textLayout: "titleArtist", showWaveform: false },
  cassette: { motion: "breathe", filter: "warm", textLayout: "titleArtist", showWaveform: false },
  neon: { motion: "snapZoom", filter: "clean", textLayout: "titleArtist", showWaveform: false },
  noir: { motion: "kenBurnsIn", filter: "clean", textLayout: "titleArtist", showWaveform: false },
  ticket: { motion: "breathe", filter: "warm", textLayout: "bigHook", showWaveform: false },
  orbit: { motion: "breathe", filter: "clean", textLayout: "titleArtist", showWaveform: false },
}

export const STORY_VIDEO_ACCENT_SWATCHES = [
  "#E2532F",
  "#F5F5F5",
  "#FFE566",
  "#7CFFB2",
  "#6EB6FF",
  "#C77DFF",
  "#FF6B9D",
  "#111111",
] as const

export function isStoryVideoTemplate(v: unknown): v is StoryVideoTemplate {
  return typeof v === "string" && (STORY_VIDEO_TEMPLATES as readonly string[]).includes(v)
}

export function isStoryVideoMotion(v: unknown): v is StoryVideoMotion {
  return typeof v === "string" && (STORY_VIDEO_MOTIONS as readonly string[]).includes(v)
}

export function isStoryVideoFilter(v: unknown): v is StoryVideoFilter {
  return typeof v === "string" && (STORY_VIDEO_FILTERS as readonly string[]).includes(v)
}

export function isStoryVideoTextLayout(v: unknown): v is StoryVideoTextLayout {
  return typeof v === "string" && (STORY_VIDEO_TEXT_LAYOUTS as readonly string[]).includes(v)
}

export function clampStoryVideoStartSec(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(STORY_VIDEO_START_MAX_SEC, Math.floor(value)))
}

export function clampStoryVideoDurationSec(value: number): number {
  if (!Number.isFinite(value)) return STORY_VIDEO_DURATION_SEC
  return Math.max(
    STORY_VIDEO_DURATION_MIN_SEC,
    Math.min(STORY_VIDEO_DURATION_MAX_SEC, Math.round(value))
  )
}

/** Нормализует пару [от, до] в startSec + durationSec с лимитом 5-30 сек. */
export function normalizeStoryVideoRange(
  fromSec: number,
  toSec: number,
  trackDurationSec?: number
): { startSec: number; durationSec: number; endSec: number } {
  let a = Math.floor(Number.isFinite(fromSec) ? fromSec : 0)
  let b = Math.floor(Number.isFinite(toSec) ? toSec : a + STORY_VIDEO_DURATION_SEC)
  if (b < a) {
    const t = a
    a = b
    b = t
  }
  let duration = clampStoryVideoDurationSec(b - a)
  let start = clampStoryVideoStartSec(a)
  const trackMax = Number.isFinite(trackDurationSec)
    ? Math.max(0, Math.floor(trackDurationSec as number))
    : STORY_VIDEO_START_MAX_SEC + STORY_VIDEO_DURATION_MAX_SEC

  if (start + duration > trackMax && trackMax > 0) {
    start = Math.max(0, trackMax - duration)
  }
  if (start + duration > trackMax && trackMax > 0) {
    duration = Math.max(STORY_VIDEO_DURATION_MIN_SEC, trackMax - start)
    duration = clampStoryVideoDurationSec(duration)
  }

  return {
    startSec: start,
    durationSec: duration,
    endSec: start + duration,
  }
}

export function clampStoryVideoMotionSpeed(value: number): number {
  if (!Number.isFinite(value)) return 100
  return Math.max(70, Math.min(130, Math.round(value)))
}

export function clampStoryVideoTextAxis(value: number): number {
  if (!Number.isFinite(value)) return 50
  return Math.max(4, Math.min(96, Math.round(value)))
}

export function isStoryVideoTextAlign(v: unknown): v is StoryVideoTextAlign {
  return typeof v === "string" && (STORY_VIDEO_TEXT_ALIGNS as readonly string[]).includes(v)
}

export function isStoryVideoBadgeId(v: unknown): v is StoryVideoBadgeId {
  return typeof v === "string" && (STORY_VIDEO_BADGE_IDS as readonly string[]).includes(v)
}

export function normalizeStoryVideoBadges(value: unknown): StoryVideoBadgeId[] {
  if (!Array.isArray(value)) return []
  const out: StoryVideoBadgeId[] = []
  for (const item of value) {
    if (isStoryVideoBadgeId(item) && !out.includes(item)) out.push(item)
  }
  return out
}

export function toggleStoryVideoBadge(
  current: StoryVideoBadgeId[],
  id: StoryVideoBadgeId
): StoryVideoBadgeId[] {
  if (current.includes(id)) return current.filter((b) => b !== id)
  // Сохраняем канонический порядок площадок
  const next = [...current, id]
  return STORY_VIDEO_BADGE_IDS.filter((b) => next.includes(b))
}

export function normalizeAccentHex(
  value: string,
  fallback: string = DEFAULT_STORY_VIDEO_PROJECT.accent
): string {
  const raw = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase()
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`
  return fallback.toUpperCase().startsWith("#")
    ? fallback.toUpperCase()
    : DEFAULT_STORY_VIDEO_PROJECT.accent
}

export function applyStoryVideoTemplate(
  project: StoryVideoProject,
  template: StoryVideoTemplate
): StoryVideoProject {
  const look = STORY_VIDEO_TEMPLATE_LOOK[template]
  return {
    ...project,
    template,
    motion: look.motion,
    filter: look.filter,
    textLayout: look.textLayout,
    showWaveform: look.showWaveform,
    // Neon / Noir завязаны на рамку - включаем при выборе шаблона
    ...(template === "neon" || template === "noir" ? { showFrame: true } : {}),
  }
}
