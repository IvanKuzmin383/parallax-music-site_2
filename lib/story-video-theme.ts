/** Клиентский конструктор сторис-видео: шаблоны, motion, фильтры, текст. */

export const STORY_VIDEO_WIDTH = 720
export const STORY_VIDEO_HEIGHT = 1280
export const STORY_VIDEO_FPS = 30
export const STORY_VIDEO_DURATION_SEC = 15
export const STORY_VIDEO_START_MAX_SEC = 600

export const STORY_VIDEO_TEMPLATES = [
  "blurPulse",
  "poster",
  "filmGrain",
  "lyricCard",
  "vinyl",
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

export type StoryVideoProject = {
  template: StoryVideoTemplate
  motion: StoryVideoMotion
  filter: StoryVideoFilter
  textLayout: StoryVideoTextLayout
  title: string
  artist: string
  hookText: string
  accent: string
  startSec: number
  durationSec: typeof STORY_VIDEO_DURATION_SEC
  motionSpeed: number
  showWaveform: boolean
}

export const DEFAULT_STORY_VIDEO_PROJECT: StoryVideoProject = {
  template: "blurPulse",
  motion: "kenBurnsIn",
  filter: "clean",
  textLayout: "titleArtist",
  title: "Название трека",
  artist: "Имя артиста",
  hookText: "Слушай сейчас",
  accent: "#E2532F",
  startSec: 0,
  durationSec: STORY_VIDEO_DURATION_SEC,
  motionSpeed: 100,
  showWaveform: true,
}

export const STORY_VIDEO_TEMPLATE_META: Record<
  StoryVideoTemplate,
  { label: string; description: string }
> = {
  blurPulse: { label: "Blur Pulse", description: "Размытый фон и обложка по центру" },
  poster: { label: "Poster", description: "Обложка почти на весь кадр" },
  filmGrain: { label: "Film Grain", description: "Кино, letterbox и зерно" },
  lyricCard: { label: "Lyric Card", description: "Крупная фраза поверх трека" },
  vinyl: { label: "Vinyl", description: "Круглая обложка и виниловый вайб" },
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
  snapZoom: { label: "Snap Zoom", description: "Резкие акценты на хуке" },
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
  titleArtist: { label: "Title / Artist", description: "Название и артист снизу" },
  bigHook: { label: "Big Hook", description: "Одна крупная фраза" },
}

export type StoryVideoTemplateLook = Pick<
  StoryVideoProject,
  "motion" | "filter" | "textLayout" | "showWaveform"
>

export const STORY_VIDEO_TEMPLATE_LOOK: Record<StoryVideoTemplate, StoryVideoTemplateLook> = {
  blurPulse: { motion: "breathe", filter: "clean", textLayout: "titleArtist", showWaveform: true },
  poster: { motion: "kenBurnsIn", filter: "warm", textLayout: "titleArtist", showWaveform: false },
  filmGrain: { motion: "kenBurnsOut", filter: "grain", textLayout: "titleArtist", showWaveform: false },
  lyricCard: { motion: "kenBurnsIn", filter: "clean", textLayout: "bigHook", showWaveform: true },
  vinyl: { motion: "kenBurnsIn", filter: "warm", textLayout: "titleArtist", showWaveform: true },
  neon: { motion: "snapZoom", filter: "clean", textLayout: "titleArtist", showWaveform: true },
  noir: { motion: "kenBurnsIn", filter: "clean", textLayout: "titleArtist", showWaveform: false },
  ticket: { motion: "breathe", filter: "warm", textLayout: "bigHook", showWaveform: false },
  orbit: { motion: "breathe", filter: "clean", textLayout: "titleArtist", showWaveform: true },
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

export function clampStoryVideoMotionSpeed(value: number): number {
  if (!Number.isFinite(value)) return 100
  return Math.max(70, Math.min(130, Math.round(value)))
}

export function normalizeAccentHex(value: string): string {
  const raw = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase()
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`
  return DEFAULT_STORY_VIDEO_PROJECT.accent
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
  }
}
