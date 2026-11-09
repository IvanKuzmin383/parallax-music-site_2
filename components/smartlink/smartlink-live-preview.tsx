"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { SmartlinkLanding } from "@/components/smartlink/smartlink-landing"
import { type PlatformLinks } from "@/lib/smartlink-platforms"
import { getSiteOrigin } from "@/lib/smartlink-public-origin"
import {
  DEFAULT_SMARTLINK_THEME,
  SMARTLINK_PRESET_LOOK,
  SMARTLINK_PRESET_META,
  getOrderedSmartlinkLinks,
  type SmartlinkPreset,
  type SmartlinkTheme,
} from "@/lib/smartlink-theme"
import { cn } from "@/lib/utils"

const DEMO_COVER = "/aicover/example-03.webp"
const DEMO_TITLE = "Midnight Signal"
const DEMO_ARTIST = "PRLLX Demo"

const DEMO_LINKS: PlatformLinks = {
  spotify: "https://open.spotify.com",
  appleMusic: "https://music.apple.com",
  yandex: "https://music.yandex.ru",
  youtubeMusic: "https://music.youtube.com",
  vk: "https://vk.com/music",
  deezer: "https://www.deezer.com",
  tidal: "https://tidal.com",
}

/** Пресеты, которые крутим в живом демо (как на prllx.link). */
export const SMARTLINK_LIVE_PRESETS: SmartlinkPreset[] = [
  "inkblot",
  "cassette",
  "graffiti",
  "holo",
  "ticket",
  "vinyl",
  "rave",
  "chrome",
]

const ROTATE_MS = 4200

function themeForPreset(preset: SmartlinkPreset, animation: SmartlinkTheme["animation"] = "cascade"): SmartlinkTheme {
  const look = SMARTLINK_PRESET_LOOK[preset]
  return {
    ...DEFAULT_SMARTLINK_THEME,
    ...look,
    preset,
    accent: DEFAULT_SMARTLINK_THEME.accent,
    animation,
    animationSpeed: 100,
    previewAudioEnabled: false,
    previewAudioStartSec: 0,
  }
}

type SmartlinkLivePreviewProps = {
  /**
   * Компактная врезка для карточки на главной.
   * `lg` - высокий телефон (карточка на 2 ряда в мастерской).
   */
  compact?: boolean | "sm" | "lg"
  /** Чипы пресетов под превью (на лендинге prllx). */
  showPresetPicker?: boolean
  className?: string
  label?: string
}

export function SmartlinkLivePreview({
  compact = false,
  showPresetPicker,
  className,
  label = "Live preview",
}: SmartlinkLivePreviewProps) {
  const compactMode = compact === true ? "sm" : compact === false ? false : compact
  const isCompact = Boolean(compactMode)
  const showPresets = showPresetPicker ?? !isCompact
  const site = getSiteOrigin()
  const rootRef = useRef<HTMLDivElement>(null)
  const [preset, setPreset] = useState<SmartlinkPreset>("inkblot")
  const [autoRotate, setAutoRotate] = useState(true)
  const [inView, setInView] = useState(!isCompact)

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.25 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!autoRotate || !inView) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const id = window.setInterval(() => {
      setPreset((prev) => {
        const i = SMARTLINK_LIVE_PRESETS.indexOf(prev)
        return SMARTLINK_LIVE_PRESETS[(i + 1) % SMARTLINK_LIVE_PRESETS.length] ?? SMARTLINK_LIVE_PRESETS[0]
      })
    }, ROTATE_MS)
    return () => window.clearInterval(id)
  }, [autoRotate, inView])

  const theme = useMemo(() => themeForPreset(preset, "cascade"), [preset])
  const links = useMemo(() => getOrderedSmartlinkLinks(DEMO_LINKS, theme), [theme])

  const pickPreset = (next: SmartlinkPreset) => {
    setAutoRotate(false)
    setPreset(next)
  }

  const compactViewport =
    compactMode === "lg"
      ? { height: "h-[460px]", scale: 0.72, widthPct: "138.9%", marginLeft: "-19.45%", landingMin: "!min-h-[640px]" }
      : compactMode === "sm"
        ? { height: "h-[220px]", scale: 0.52, widthPct: "192.3%", marginLeft: "-46.15%", landingMin: "!min-h-[480px]" }
        : null

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative mx-auto w-full",
        isCompact ? (compactMode === "lg" ? "max-w-[260px]" : "max-w-[300px]") : "max-w-[340px] lg:max-w-none",
        className,
      )}
    >
      {!isCompact ? (
        <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent opacity-60 blur-xl" />
      ) : null}
      <div
        className={cn(
          "relative overflow-hidden border border-white/15 bg-black/40 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-md",
          isCompact ? "rounded-2xl" : "rounded-[1.75rem]",
        )}
      >
        <div className="border-b border-white/10 px-4 py-2.5">
          <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">{label}</span>
        </div>
        <div
          className={cn(
            "[&_a]:pointer-events-none",
            compactViewport
              ? cn("relative overflow-hidden", compactViewport.height)
              : "prllx-preview-scroll max-h-[720px] overflow-y-auto sm:max-h-[780px]",
          )}
        >
          <div
            className={cn(compactViewport && "origin-top")}
            style={
              compactViewport
                ? {
                    transform: `scale(${compactViewport.scale})`,
                    width: compactViewport.widthPct,
                    marginLeft: compactViewport.marginLeft,
                  }
                : undefined
            }
          >
            <SmartlinkLanding
              key={preset}
              title={DEMO_TITLE}
              artist={DEMO_ARTIST}
              coverUrl={DEMO_COVER}
              links={links}
              theme={theme}
              preview
              brandHref={site}
              brandLabel="Powered by Parallax"
              className={compactViewport ? compactViewport.landingMin : "!min-h-[680px]"}
            />
          </div>
        </div>
      </div>
      {showPresets ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {SMARTLINK_LIVE_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => pickPreset(p)}
              className={cn(
                "rounded-full px-3 py-1 text-[11px] font-medium transition",
                preset === p
                  ? "bg-[#E2532F] text-white"
                  : "bg-white/8 text-white/60 hover:bg-white/14 hover:text-white",
              )}
            >
              {SMARTLINK_PRESET_META[p].label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
