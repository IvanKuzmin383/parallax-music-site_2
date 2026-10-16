import type { CSSProperties } from "react"
import { SmartlinkAudioGate } from "@/components/smartlink/smartlink-audio-gate"
import { SmartlinkRaveBlobs } from "@/components/smartlink/smartlink-rave-blobs"
import {
  SOCIAL_ICON_SRC,
  SMARTLINK_SOCIALS,
  type SmartlinkSocialItem,
} from "@/lib/smartlink-socials"
import { platformBrandColor } from "@/lib/smartlink-platforms"
import {
  SMARTLINK_FONT_META,
  contrastTextOnAccent,
  isLightSmartlinkPreset,
  smartlinkAnimationDurationMs,
  smartlinkForcesIcons,
  type SmartlinkLinkItem,
  type SmartlinkPreset,
  type SmartlinkTheme,
} from "@/lib/smartlink-theme"
import { cn } from "@/lib/utils"

export type SmartlinkLandingProps = {
  title: string
  artist: string
  coverUrl: string
  links: SmartlinkLinkItem[]
  theme: SmartlinkTheme
  brandHref?: string
  brandLabel?: string
  className?: string
  preview?: boolean
  /** Публичный короткий mp3-хук; в кабинетном превью не передаём. */
  previewAudioSrc?: string | null
}

function coverRadiusClass(shape: SmartlinkTheme["cover"], preset: SmartlinkPreset) {
  if (preset === "vinyl" || preset === "orbit") return "rounded-full"
  if (
    preset === "cinema" ||
    preset === "poster" ||
    preset === "ticket" ||
    preset === "polaroid"
  ) {
    return "rounded-none"
  }
  if (shape === "square") return "rounded-none"
  if (shape === "soft") return "rounded-[1.75rem]"
  return "rounded-xl"
}

function orbitPosition(index: number, total: number) {
  const angle = ((index / Math.max(total, 1)) * 360 - 90) * (Math.PI / 180)
  const radius = 42
  return {
    left: `${50 + radius * Math.cos(angle)}%`,
    top: `${50 + radius * Math.sin(angle)}%`,
  }
}

function animClass(theme: SmartlinkTheme) {
  if (theme.animation === "none") return undefined
  return cn(`sl-anim-${theme.animation}`)
}

function animStyle(theme: SmartlinkTheme, index = 0): CSSProperties | undefined {
  if (theme.animation === "none") return undefined
  const hailX = ((index * 37) % 21) - 10
  return {
    ["--sl-anim-ms" as string]: `${smartlinkAnimationDurationMs(theme.animationSpeed)}ms`,
    ["--sl-anim-i" as string]: String(index),
    ["--sl-hail-x" as string]: `${hailX}px`,
  }
}

function SocialRow({
  items,
  iconStyle,
  light,
}: {
  items: SmartlinkSocialItem[]
  iconStyle: NonNullable<SmartlinkTheme["socials"]>["iconStyle"]
  light: boolean
}) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {items.map((item) => {
        const meta = SMARTLINK_SOCIALS.find((s) => s.key === item.network)
        const icon = (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={SOCIAL_ICON_SRC[item.network]}
            alt=""
            className={cn("object-contain", iconStyle === "bare" ? "h-6 w-6" : "h-5 w-5")}
          />
        )
        return (
          <a
            key={item.network}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            title={meta?.label ?? item.network}
            aria-label={meta?.label ?? item.network}
            className={cn(
              "inline-flex items-center justify-center transition-transform hover:scale-105",
              iconStyle === "bare" && "p-1",
              iconStyle === "flat" &&
                cn("h-9 w-9 rounded-full", light ? "bg-black/8" : "bg-white/15"),
              iconStyle === "glass" &&
                "h-9 w-9 rounded-full border border-white/25 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] backdrop-blur-md",
            )}
          >
            {icon}
          </a>
        )
      })}
    </div>
  )
}

export function SmartlinkLanding({
  title,
  artist,
  coverUrl,
  links,
  theme,
  brandHref = "/",
  brandLabel = "Powered by Parallax",
  className,
  preview = false,
  previewAudioSrc = null,
}: SmartlinkLandingProps) {
  const preset = theme.preset
  const accentText = contrastTextOnAccent(theme.accent)
  const isSheet = isLightSmartlinkPreset(preset)
  const isTicket = preset === "ticket"
  const isPolaroid = preset === "polaroid"
  const isArcade = preset === "arcade"
  const isVhs = preset === "vhs"
  const isZine = preset === "zine"
  const isChrome = preset === "chrome"
  const isNoir = preset === "noir"
  const isOrbit = preset === "orbit"
  const isStamp = preset === "stamp"
  const isHolo = preset === "holo"
  const isDiary = preset === "diary"
  /** Светлый текст внутри контента (лист / билет / дневник / зин). */
  const contentLight = isSheet || isTicket || isDiary || isZine
  const isBlurBg =
    preset === "blur" ||
    preset === "glass" ||
    preset === "film" ||
    preset === "neon" ||
    isHolo
  const isGlassCard = preset === "glass"
  const isSignal = preset === "signal"
  const isTerminal = preset === "terminal"
  const isPoster = preset === "poster"
  const isVinyl = preset === "vinyl"
  const isCassette = preset === "cassette"
  const isCinema = preset === "cinema"
  const isCapsule = preset === "capsule"
  const isGrid = preset === "grid"
  const isNeon = preset === "neon"
  const isFilm = preset === "film"
  const isInkblot = preset === "inkblot"
  const isCarbon = preset === "carbon"
  const isSunset = preset === "sunset"
  const isGraffiti = preset === "graffiti"
  const isStage = preset === "stage"
  const isRave = preset === "rave"

  const fontStack = SMARTLINK_FONT_META[theme.font]?.stack ?? SMARTLINK_FONT_META.sans.stack

  const socials = theme.socials
  const socialItems =
    socials?.enabled && socials.items.length > 0
      ? socials.items.filter((i) => i.url.trim())
      : []
  const socialsAbove = socialItems.length > 0 && socials?.position === "above"
  const socialsBelow = socialItems.length > 0 && socials?.position !== "above"

  const forceIcons = smartlinkForcesIcons(preset)
  const iconsOnly = forceIcons || theme.platformLayout === "icons"

  const shellClass = cn(
    // overflow-y-auto: длинный список площадок должен скроллиться, не обрезаться
    // justify-start + py: контент сверху при длинной странице; короткий всё ещё читается нормально
    "relative flex min-h-full w-full flex-col items-center justify-start overflow-x-hidden overflow-y-auto",
    preview ? "min-h-[520px] px-3 py-6" : "min-h-screen px-4 py-6 sm:px-6 sm:py-8",
    isSheet ? "bg-[#F3EFE6] text-[#161616]" : "bg-[#0B0B0C] text-[#F5F5F5]",
    isCarbon && "sl-carbon-bg",
    isGraffiti && "sl-graffiti-bg",
    isStage && "sl-stage-bg",
    isRave && "sl-rave-bg",
    isArcade && "sl-arcade-bg",
    isVhs && "sl-vhs-bg",
    isNoir && "sl-noir-bg",
    isChrome && "sl-chrome-bg",
    isPolaroid && "sl-polaroid-wall",
    isDiary && "sl-diary-bg",
    isZine && "sl-zine-bg",
    isStamp && "sl-stamp-bg",
    className,
  )

  const cardClass = cn(
    // my-auto: короткий контент по центру экрана; длинный - просто скроллится
    "relative z-[1] my-auto flex w-full shrink-0 flex-col items-center gap-4",
    preview ? "max-w-[280px]" : "max-w-md",
    isSheet && !isDiary && !isZine && "rounded-2xl bg-white/90 px-4 py-6 shadow-[0_18px_50px_rgba(20,16,10,0.12)]",
    isSignal && "rounded-2xl border border-white/10 bg-black/35 px-4 py-6 backdrop-blur-md",
    isGlassCard &&
      "rounded-2xl border border-white/20 bg-white/10 px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl",
    isTicket && "sl-ticket-card px-4 py-6",
    isCinema && "gap-3 px-0",
    isCarbon && "rounded-2xl border border-white/10 bg-black/40 px-4 py-6 backdrop-blur-sm",
    isStage && "rounded-2xl border border-white/15 bg-black/50 px-4 py-6 shadow-[0_0_40px_rgba(0,0,0,0.5)]",
    isGraffiti && "gap-3 px-2",
    isRave && "sl-rave-card rounded-2xl bg-black/40 px-4 py-6",
    isArcade && "sl-arcade-card gap-3 px-3 py-5",
    isVhs && "gap-3 px-2",
    isNoir && "gap-3 border-l-2 border-[var(--sl-accent)] pl-4",
    isChrome && "rounded-2xl border border-white/15 bg-black/30 px-4 py-6 backdrop-blur-sm",
    isHolo && "rounded-2xl border border-white/20 bg-black/25 px-4 py-6 backdrop-blur-md",
    isDiary && "sl-diary-card gap-3 px-4 py-5",
    isZine && "gap-3 px-2",
    isOrbit && "gap-5",
  )

  const useIcons = iconsOnly
  /** Разрыв «как бумага» на hover - лист / билет / зин, только список кнопок. */
  const usePaperTear = !useIcons && (preset === "sheet" || preset === "ticket" || preset === "zine")
  /** Лист и билет - вертикальный разрыв; зин - горизонтальный. */
  const paperTearVertical = usePaperTear && (preset === "sheet" || preset === "ticket")

  const buttonBase = cn(
    "inline-flex items-center font-medium no-underline transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]",
    usePaperTear && "hover:!scale-100 active:!scale-100",
    useIcons && !isVinyl && !isOrbit
      ? "h-12 w-12 shrink-0 justify-center"
      : isVinyl || isOrbit
        ? "h-12 w-12 shrink-0 justify-center rounded-full"
        : isCapsule
          ? "h-10 w-full justify-between gap-2.5 rounded-full px-4 text-sm"
          : isCinema
            ? "h-10 w-full justify-center gap-2.5 rounded-none px-3 text-sm tracking-wide uppercase"
            : isTerminal
              ? "h-9 w-full justify-start gap-2 rounded-none border-0 border-b px-1 text-sm"
              : isPoster
                ? "h-9 w-full justify-center gap-2 rounded-none px-3 text-xs font-semibold uppercase tracking-wider"
                : isArcade
                  ? "h-10 w-full justify-center gap-2.5 rounded-none px-3 text-xs font-bold uppercase tracking-wider"
                  : isVhs
                    ? "h-9 w-full justify-center gap-2 rounded-none px-3 text-xs uppercase tracking-[0.14em]"
                    : isStamp
                      ? "h-10 w-full justify-center gap-2 rounded-sm px-3 text-xs uppercase tracking-wide"
                      : isInkblot
                        ? "h-10 w-full justify-center gap-2.5 px-4 text-sm"
                        : "h-10 w-full justify-center gap-2.5 px-3 text-sm",
  )

  const useGlassButton =
    theme.buttons === "glass" || (isGlassCard && theme.buttons === "soft") || isFilm
  const fgOnPage = contentLight ? "#161616" : "#F5F5F5"

  const inkblotShapeClass = (index: number) => {
    const variants = ["sl-inkblot", "sl-inkblot-1", "sl-inkblot-2", "sl-inkblot-3"] as const
    return variants[index % variants.length]
  }

  const buttonClassFor = (index: number) =>
    cn(
      buttonBase,
      !useIcons &&
        !isCapsule &&
        !isCinema &&
        !isTerminal &&
        !isPoster &&
        !isArcade &&
        !isVhs &&
        !isStamp &&
        (isSignal && theme.buttons === "solid"
          ? "rounded-none"
          : isInkblot
            ? inkblotShapeClass(index)
            : "rounded-xl"),
      isGrid && "rounded-lg",
      isNeon && "sl-neon-btn",
      isGraffiti &&
        cn(
          "sl-graffiti-btn font-semibold uppercase tracking-wide hover:!scale-100 active:!scale-[0.98]",
          `sl-graffiti-btn-${index % 4}`,
        ),
      isStage && "rounded-sm uppercase tracking-[0.08em]",
      isRave && "rounded-sm font-mono uppercase tracking-wider",
      isZine && "rounded-none font-bold uppercase",
      isNoir && "rounded-none tracking-[0.1em] uppercase",
      isChrome && "rounded-full",
      isHolo && "sl-holo-btn rounded-xl",
      isDiary && "sl-diary-btn rounded-sm hover:!scale-100 active:!scale-[0.99]",
      isPolaroid && "rounded-md",
    )

  const buttonVisualStyle = (linkKey?: string): CSSProperties => {
    const drop = theme.buttonShadow ? "0 10px 28px rgba(0,0,0,0.28)" : undefined

    /** Тень/контур из «Деталей» поверх характера стиля. */
    const withDetails = (base: CSSProperties, opts?: { keepBorder?: boolean }): CSSProperties => {
      const next: CSSProperties = { ...base }
      if (!theme.buttonBorder && !opts?.keepBorder) {
        if (next.border && next.border !== "none") next.border = "1px solid transparent"
        if (next.borderBottom && typeof next.borderBottom === "string") {
          next.borderBottom = "1px solid transparent"
        }
        if (next.borderLeft && typeof next.borderLeft === "string" && !isNoir) {
          next.borderLeft = "1px solid transparent"
        }
      }
      if (drop) {
        const prev = next.boxShadow
        next.boxShadow =
          !prev || prev === "none" ? drop : `${String(prev)}, ${drop}`
      } else if (next.boxShadow === undefined) {
        next.boxShadow = "none"
      }
      return next
    }

    // Винил / орбита: кружки в цвет фона страницы, без акцентной заливки
    if (isVinyl || isOrbit) {
      return withDetails({
        backgroundColor: contentLight ? "#F3EFE6" : "#0B0B0C",
        color: fgOnPage,
        border: contentLight
          ? "1px solid rgba(22,22,22,0.12)"
          : "1px solid rgba(255,255,255,0.14)",
        boxShadow: "none",
      }, { keepBorder: true })
    }

    if (isInkblot) {
      const fill = platformBrandColor(linkKey ?? "other", theme.accent)
      const inkText = contrastTextOnAccent(fill)
      return withDetails(
        {
          backgroundColor: fill,
          color: inkText,
          border: theme.buttonBorder
            ? `1px solid color-mix(in srgb, ${inkText} 12%, transparent)`
            : "1px solid transparent",
          boxShadow: "0 8px 22px rgba(0,0,0,0.28)",
          ["--sl-ink-icon-filter" as string]:
            inkText === "#FAFAFA" ? "brightness(0) invert(1)" : "brightness(0)",
        },
        { keepBorder: true },
      )
    }

    if (isGraffiti) {
      return withDetails({
        backgroundColor: theme.accent,
        color: accentText,
        border: theme.buttonBorder ? "2px solid #111" : "2px solid transparent",
        boxShadow: `4px 4px 0 #111, 0 0 0 1px color-mix(in srgb, ${theme.accent} 40%, transparent)`,
        transform: `rotate(${linkKey ? (((linkKey.charCodeAt(0) % 5) - 2) * 0.6) : 0}deg)`,
      }, { keepBorder: true })
    }

    if (isStage) {
      return withDetails({
        backgroundColor: "rgba(20,20,22,0.85)",
        color: fgOnPage,
        border: theme.buttonBorder
          ? `1px solid color-mix(in srgb, ${theme.accent} 55%, #888)`
          : "1px solid transparent",
        boxShadow: `0 0 18px color-mix(in srgb, ${theme.accent} 25%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)`,
      }, { keepBorder: true })
    }

    if (isRave) {
      return withDetails({
        backgroundColor: "transparent",
        color: theme.accent,
        border: theme.buttonBorder
          ? `1px solid color-mix(in srgb, ${theme.accent} 70%, transparent)`
          : "1px solid transparent",
        boxShadow: `0 0 14px color-mix(in srgb, ${theme.accent} 40%, transparent)`,
      }, { keepBorder: true })
    }

    if (isArcade) {
      return withDetails({
        backgroundColor: theme.accent,
        color: accentText,
        border: theme.buttonBorder ? "3px solid #111" : "3px solid transparent",
        boxShadow: "inset -2px -2px 0 rgba(0,0,0,0.35), inset 2px 2px 0 rgba(255,255,255,0.35)",
        imageRendering: "pixelated",
      }, { keepBorder: true })
    }

    if (isVhs) {
      return withDetails({
        backgroundColor: "rgba(10, 20, 40, 0.65)",
        color: "#9ad0ff",
        border: theme.buttonBorder
          ? "1px solid rgba(120, 180, 255, 0.45)"
          : "1px solid transparent",
        boxShadow: "0 0 12px rgba(80, 140, 255, 0.25)",
      }, { keepBorder: true })
    }

    if (isZine) {
      const tilt = linkKey ? ((linkKey.charCodeAt(0) % 5) - 2) * 0.8 : 0
      return withDetails({
        backgroundColor: "#111",
        color: "#f5f5f5",
        border: theme.buttonBorder ? `2px solid ${theme.accent}` : "2px solid transparent",
        boxShadow: `3px 3px 0 ${theme.accent}`,
        transform: `rotate(${tilt}deg)`,
      }, { keepBorder: true })
    }

    if (isChrome) {
      return withDetails({
        backgroundImage:
          "linear-gradient(145deg, #f5f5f5 0%, #b8b8c0 28%, #7a7a86 52%, #d8d8e0 78%, #9a9aa6 100%)",
        color: "#111",
        border: theme.buttonBorder
          ? "1px solid rgba(255,255,255,0.55)"
          : "1px solid transparent",
        boxShadow: "0 8px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.7)",
      }, { keepBorder: true })
    }

    if (isNoir) {
      return withDetails({
        backgroundColor: "transparent",
        color: "#f0f0f0",
        border: theme.buttonBorder ? "1px solid rgba(240,240,240,0.55)" : "1px solid transparent",
        borderLeft: `3px solid ${theme.accent}`,
        boxShadow: "none",
      }, { keepBorder: true })
    }

    if (isStamp) {
      const tilt = linkKey ? ((linkKey.charCodeAt(0) % 7) - 3) * 1.2 : 0
      return withDetails({
        backgroundColor: contentLight ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.06)",
        color: fgOnPage,
        border: theme.buttonBorder
          ? `2px dashed color-mix(in srgb, ${theme.accent} 70%, ${fgOnPage})`
          : "2px solid transparent",
        boxShadow: `1px 1px 0 color-mix(in srgb, ${theme.accent} 40%, transparent)`,
        transform: `rotate(${tilt}deg)`,
      }, { keepBorder: true })
    }

    if (isHolo) {
      return withDetails({
        backgroundImage:
          "linear-gradient(120deg, color-mix(in srgb, var(--sl-accent) 35%, transparent), rgba(255,255,255,0.18), color-mix(in srgb, var(--sl-accent) 25%, #7dd3fc))",
        color: fgOnPage,
        border: theme.buttonBorder
          ? "1px solid rgba(255,255,255,0.35)"
          : "1px solid transparent",
        boxShadow: "0 0 18px color-mix(in srgb, var(--sl-accent) 30%, transparent)",
        backgroundSize: "200% 200%",
      }, { keepBorder: true })
    }

    if (isDiary) {
      return withDetails({
        backgroundColor: "rgba(255,255,255,0.55)",
        color: "#2a2a2a",
        border: theme.buttonBorder
          ? "1px solid rgba(40,40,40,0.18)"
          : "1px solid transparent",
        boxShadow: "1px 1px 0 rgba(40,40,40,0.08)",
      }, { keepBorder: true })
    }

    if (isPolaroid) {
      return withDetails({
        backgroundColor: "rgba(255,255,255,0.92)",
        color: "#222",
        border: theme.buttonBorder
          ? "1px solid rgba(0,0,0,0.08)"
          : "1px solid transparent",
        boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
      }, { keepBorder: true })
    }

    if (isNeon) {
      return withDetails({
        backgroundColor: "transparent",
        color: theme.accent,
        border: theme.buttonBorder
          ? `1.5px solid ${theme.accent}`
          : `1.5px solid color-mix(in srgb, ${theme.accent} 35%, transparent)`,
        boxShadow: `0 0 16px color-mix(in srgb, ${theme.accent} 55%, transparent), inset 0 0 12px color-mix(in srgb, ${theme.accent} 18%, transparent)`,
      }, { keepBorder: true })
    }

    if (isSunset) {
      return withDetails({
        backgroundImage: `linear-gradient(135deg, ${theme.accent}, #0a0a0a 85%)`,
        color: "#FAFAFA",
        border: "1px solid transparent",
        boxShadow: drop,
      }, { keepBorder: true })
    }

    if (isTerminal) {
      return withDetails({
        backgroundColor: "transparent",
        color: fgOnPage,
        borderBottom: theme.buttonBorder
          ? `1px solid color-mix(in srgb, ${fgOnPage} 22%, transparent)`
          : "1px solid transparent",
        borderRadius: 0,
      }, { keepBorder: true })
    }

    if (isGrid) {
      return withDetails({
        backgroundColor: "transparent",
        color: fgOnPage,
        border: theme.buttonBorder
          ? `1px solid color-mix(in srgb, ${fgOnPage} 28%, transparent)`
          : "1px solid transparent",
        boxShadow: "none",
      }, { keepBorder: true })
    }

    if (isCarbon) {
      return withDetails({
        backgroundColor: "rgba(255,255,255,0.06)",
        color: fgOnPage,
        border: theme.buttonBorder
          ? "1px solid rgba(255,255,255,0.18)"
          : "1px solid transparent",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }, { keepBorder: true })
    }

    if (useGlassButton) {
      return {
        backgroundColor: contentLight ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.12)",
        color: fgOnPage,
        border: theme.buttonBorder
          ? contentLight
            ? "1px solid rgba(22,22,22,0.14)"
            : "1px solid rgba(255,255,255,0.28)"
          : "none",
        boxShadow: drop
          ? `${drop}, inset 0 1px 0 rgba(255,255,255,0.25)`
          : "inset 0 1px 0 rgba(255,255,255,0.25)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }
    }

    if (theme.buttons === "bare") {
      return {
        backgroundColor: "transparent",
        color: fgOnPage,
        border: "none",
        boxShadow: "none",
      }
    }

    if (theme.buttons === "outline" || isTicket) {
      return {
        backgroundColor: "transparent",
        color: fgOnPage,
        border: theme.buttonBorder ? `1.5px solid ${theme.accent}` : "none",
        boxShadow: drop,
      }
    }

    if (theme.buttons === "soft") {
      return {
        backgroundColor: contentLight
          ? `color-mix(in srgb, ${theme.accent} 14%, #ffffff)`
          : `color-mix(in srgb, ${theme.accent} 22%, rgba(255,255,255,0.08))`,
        color: fgOnPage,
        border: theme.buttonBorder
          ? `1px solid color-mix(in srgb, ${theme.accent} 45%, transparent)`
          : "none",
        boxShadow: drop,
      }
    }

    return {
      backgroundColor: theme.accent,
      color: accentText,
      border: theme.buttonBorder
        ? `1px solid color-mix(in srgb, ${accentText} 18%, transparent)`
        : "none",
      borderLeftWidth: !useIcons && isSignal && theme.buttonBorder ? 4 : undefined,
      borderLeftColor: !useIcons && isSignal && theme.buttonBorder ? theme.accent : undefined,
      boxShadow: drop,
    }
  }

  let animIndex = 0
  const coverMax = preview ? "max-w-[190px]" : "max-w-[280px]"
  const posterCoverMax = preview ? "max-w-[240px]" : "max-w-[320px]"

  const renderLinks = () => {
    if (isOrbit) return null
    if (links.length === 0) {
      return <p className="text-center text-sm opacity-60">Ссылки на площадки скоро появятся</p>
    }

    return (
      <div
        className={cn(
          "w-full",
          useIcons
            ? cn(
                "flex flex-wrap justify-center",
                isVinyl ? "gap-2.5" : "gap-2",
                isGrid ? (preview ? "max-w-[200px]" : "max-w-[280px]") : coverMax,
              )
            : cn(
                "mx-auto flex w-full flex-col",
                coverMax,
                isPoster ? "gap-1" : isTerminal ? "gap-0" : "gap-1.5",
              ),
        )}
      >
        {links.map((link, linkIndex) => {
          const i = animIndex++
          const platformKey = link.key.startsWith("extra:") ? "other" : link.key
          const visual = buttonVisualStyle(platformKey)
          const faceContent = (
            <>
              {isTerminal ? (
                <span className="opacity-50" aria-hidden>
                  &gt;
                </span>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={link.iconSrc}
                alt=""
                width={useIcons ? 28 : 22}
                height={useIcons ? 28 : 22}
                className={cn(
                  "shrink-0 object-contain",
                  useIcons ? "h-7 w-7" : "h-5 w-5",
                  isVinyl ? "rounded-full" : "rounded-[22%]",
                  isInkblot && "sl-inkblot-icon",
                )}
                loading="lazy"
                decoding="async"
              />
              {!useIcons ? <span className="truncate">{link.label}</span> : null}
              {isCapsule && !useIcons ? (
                <span className="opacity-70" aria-hidden>
                  →
                </span>
              ) : null}
              {isTerminal ? (
                <span className="ml-auto opacity-40" aria-hidden>
                  →
                </span>
              ) : null}
            </>
          )
          const faceStyle: CSSProperties = {
            backgroundColor: visual.backgroundColor,
            backgroundImage: visual.backgroundImage,
            backgroundSize: visual.backgroundSize,
            color: visual.color,
            border: visual.border,
            borderLeft: visual.borderLeft,
            borderBottom: visual.borderBottom,
            boxShadow: visual.boxShadow,
            backdropFilter: visual.backdropFilter,
            WebkitBackdropFilter: visual.WebkitBackdropFilter,
          }
          return (
            <a
              key={link.key}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
              aria-label={link.label}
              className={cn(
                buttonClassFor(linkIndex),
                animClass(theme),
                usePaperTear && "sl-paper-tear",
                paperTearVertical && "sl-paper-tear-v",
              )}
              style={
                usePaperTear
                  ? {
                      color: visual.color,
                      ...animStyle(theme, i),
                    }
                  : {
                      ...visual,
                      ...animStyle(theme, i),
                    }
              }
            >
              {usePaperTear ? (
                <>
                  <span className="sl-paper-tear-face sl-paper-tear-a" aria-hidden style={faceStyle}>
                    {faceContent}
                  </span>
                  <span className="sl-paper-tear-face sl-paper-tear-b" aria-hidden style={faceStyle}>
                    {faceContent}
                  </span>
                </>
              ) : (
                faceContent
              )}
            </a>
          )
        })}
      </div>
    )
  }

  const titleBlock = (
    <div
      className={cn(
        "w-full space-y-0.5 text-center",
        isTerminal && "text-left font-mono",
        animClass(theme),
      )}
      style={animStyle(theme, animIndex++)}
    >
          <h1
            className={cn(
              "font-semibold tracking-tight",
              preview ? "text-lg" : "text-2xl sm:text-[1.7rem]",
              isTerminal && "text-base tracking-normal uppercase sm:text-lg",
              isCinema && "tracking-[0.08em] uppercase",
              isGraffiti && "uppercase italic tracking-wide",
              isStage && "tracking-[0.12em] uppercase",
              isRave && "font-mono uppercase tracking-[0.14em]",
              isArcade && "font-mono uppercase tracking-wider",
              isVhs && "font-mono uppercase tracking-[0.16em]",
              isNoir && "tracking-[0.14em] uppercase",
              isZine && "uppercase italic",
              isDiary && "italic font-normal",
              isChrome && "tracking-tight",
              isHolo && "tracking-wide",
            )}
          >
            {title}
          </h1>
      <p
        className={cn(
          "opacity-70",
          preview ? "text-sm" : "text-base sm:text-lg",
          isTerminal && "text-xs opacity-50",
          isDiary && "opacity-55",
          isNoir && "tracking-[0.08em] uppercase text-xs opacity-50",
        )}
      >
        {artist}
      </p>
    </div>
  )

  const coverBlock = isVinyl ? (
    <div
      className={cn(
        "relative aspect-square w-full",
        coverMax,
        theme.coverShadow && "drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]",
        animClass(theme),
      )}
      style={animStyle(theme, animIndex++)}
    >
      <div className="sl-vinyl-disc sl-vinyl-spin relative h-full w-full overflow-hidden rounded-full">
        <div aria-hidden className="sl-vinyl-grooves absolute inset-0 rounded-full" />
        <div className="sl-vinyl-label absolute left-1/2 top-1/2 z-[1] aspect-square w-[56%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full shadow-[0_0_0_3px_rgba(0,0,0,0.55)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover"
            sizes={preview ? "80px" : "120px"}
          />
        </div>
        <div
          aria-hidden
          className="sl-vinyl-spindle absolute left-1/2 top-1/2 z-[2] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1a1a] ring-1 ring-white/25"
        />
      </div>
    </div>
  ) : isOrbit ? (
    <div
      className={cn(
        "sl-orbit relative aspect-square w-full",
        preview ? "max-w-[240px]" : "max-w-[320px]",
        animClass(theme),
      )}
      style={animStyle(theme, animIndex++)}
    >
      <div
        className={cn(
          "absolute left-1/2 top-1/2 z-[2] aspect-square w-[48%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-black/30",
          theme.coverShadow && "shadow-[0_12px_32px_rgba(0,0,0,0.45)]",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coverUrl} alt={title} className="h-full w-full object-cover" sizes={preview ? "110px" : "150px"} />
      </div>
      {links.length === 0 ? (
        <p className="absolute inset-x-0 bottom-0 text-center text-xs opacity-60">Ссылки скоро</p>
      ) : (
        <div className="sl-orbit-wheel absolute inset-0 z-[1]">
          <div aria-hidden className="sl-orbit-ring pointer-events-none absolute inset-[8%] rounded-full" />
          {links.map((link, linkIndex) => {
            const pos = orbitPosition(linkIndex, links.length)
            return (
              <div
                key={link.key}
                className="sl-orbit-slot absolute z-[2] h-11 w-11"
                style={{
                  left: pos.left,
                  top: pos.top,
                  ["--sl-orbit-delay" as string]: `${linkIndex * 0.35}s`,
                }}
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={link.label}
                  aria-label={link.label}
                  className="sl-orbit-planet flex h-full w-full items-center justify-center rounded-full border border-white/20 bg-black/55 shadow-[0_4px_14px_rgba(0,0,0,0.35)] backdrop-blur-sm"
                  style={{
                    boxShadow: `0 0 14px color-mix(in srgb, ${theme.accent} 35%, transparent)`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={link.iconSrc}
                    alt=""
                    width={26}
                    height={26}
                    className="h-6 w-6 rounded-full object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </a>
              </div>
            )
          })}
        </div>
      )}
    </div>
  ) : isPolaroid ? (
    <div
      className={cn(
        "sl-polaroid relative w-full rotate-[-2deg]",
        preview ? "max-w-[200px]" : "max-w-[260px]",
        theme.coverShadow && "drop-shadow-[0_16px_28px_rgba(0,0,0,0.4)]",
        animClass(theme),
      )}
      style={animStyle(theme, animIndex++)}
    >
      <div className="bg-[#f7f4ee] p-2.5 pb-10 shadow-[0_1px_0_rgba(0,0,0,0.06)]">
        <div className="aspect-square w-full overflow-hidden bg-black/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover"
            sizes={preview ? "180px" : "240px"}
          />
        </div>
        <div className="absolute inset-x-2.5 bottom-2 text-center text-[#2a2a2a]">
          <p className={cn("truncate font-serif font-semibold leading-tight", preview ? "text-sm" : "text-base")}>
            {title}
          </p>
          <p className="truncate text-[11px] opacity-60">{artist}</p>
        </div>
      </div>
    </div>
  ) : isCassette ? (
    <div
      className={cn(
        "relative w-full",
        preview ? "max-w-[220px]" : "max-w-[300px]",
        theme.coverShadow && "drop-shadow-[0_16px_36px_rgba(0,0,0,0.5)]",
        animClass(theme),
      )}
      style={animStyle(theme, animIndex++)}
    >
      <div className="sl-cassette relative aspect-[1.55/1] w-full overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={coverUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          sizes={preview ? "220px" : "300px"}
        />
        <div aria-hidden className="sl-cassette-wrap absolute inset-0" />
        <div
          aria-hidden
          className="sl-cassette-window absolute left-[9%] right-[9%] top-[30%] h-[40%] overflow-hidden rounded-[3px]"
        >
          <div className="sl-cassette-tape absolute inset-x-[18%] top-[55%] h-[38%] -translate-y-1/2 rounded-sm" />
          {/* Play: лента слева направо - левая CCW, правая CW (вид спереди) */}
          <div className="sl-cassette-reel sl-cassette-spin-rev absolute left-[6%] top-[55%] aspect-square w-[30%] -translate-y-1/2 rounded-full">
            <span className="sl-cassette-hub" />
          </div>
          <div className="sl-cassette-reel sl-cassette-spin absolute right-[6%] top-[55%] aspect-square w-[30%] -translate-y-1/2 rounded-full">
            <span className="sl-cassette-hub" />
          </div>
        </div>
        <div
          aria-hidden
          className="sl-cassette-label absolute inset-x-[10%] bottom-[6%] h-[16%] rounded-sm"
        />
        <div aria-hidden className="sl-cassette-screw absolute left-[5%] top-[7%]" />
        <div aria-hidden className="sl-cassette-screw absolute right-[5%] top-[7%]" />
        <div aria-hidden className="sl-cassette-screw absolute left-[5%] bottom-[7%]" />
        <div aria-hidden className="sl-cassette-screw absolute right-[5%] bottom-[7%]" />
      </div>
    </div>
  ) : (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden bg-black/20",
        isPoster ? posterCoverMax : coverMax,
        coverRadiusClass(theme.cover, preset),
        theme.coverShadow && "shadow-[0_18px_40px_rgba(0,0,0,0.45)]",
        isSignal && "ring-2 ring-[var(--sl-accent)]",
        isGraffiti && "rotate-[-1.5deg] border-2 border-white shadow-[5px_5px_0_#111]",
        isStage && "ring-1 ring-white/20",
        isRave && "sl-rave-cover",
        isZine && "rotate-[-2deg] border-2 border-black shadow-[6px_6px_0_var(--sl-accent)]",
        isArcade && "border-4 border-black shadow-[4px_4px_0_var(--sl-accent)]",
        isVhs && "sl-vhs-cover",
        isNoir && "sl-noir-cover",
        isChrome && "sl-chrome-cover",
        isHolo && "sl-holo-cover",
        isDiary && "border border-black/15 shadow-[2px_2px_0_rgba(0,0,0,0.08)]",
        isStamp && "border-2 border-dashed border-white/40",
        animClass(theme),
      )}
      style={{
        ...animStyle(theme, animIndex++),
        ...(isNeon || isRave || isHolo
          ? {
              boxShadow: `0 0 28px color-mix(in srgb, ${theme.accent} 40%, transparent)`,
            }
          : null),
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={coverUrl}
        alt={title}
        className="h-full w-full object-cover"
        sizes={preview ? "190px" : "280px"}
      />
      {isPoster ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-3 pb-3 pt-10 text-left text-white">
          <h1
            className={cn(
              "font-bold leading-tight tracking-tight",
              preview ? "text-xl" : "text-3xl sm:text-4xl",
            )}
          >
            {title}
          </h1>
          <p className={cn("mt-0.5 opacity-80", preview ? "text-sm" : "text-base")}>{artist}</p>
        </div>
      ) : null}
      {isTicket ? (
        <div
          aria-hidden
          className="sl-ticket-stamp pointer-events-none absolute -right-1 top-2 rotate-12 px-2 py-1 text-[10px] font-bold tracking-[0.2em] text-[var(--sl-accent)]"
        >
          LISTEN
        </div>
      ) : null}
      {isVhs ? (
        <div
          aria-hidden
          className="pointer-events-none absolute left-2 top-2 rounded-sm border border-cyan-300/50 bg-black/50 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.2em] text-cyan-200"
        >
          PLAY ▶
        </div>
      ) : null}
      {isDiary ? (
        <div
          aria-hidden
          className="sl-diary-clip pointer-events-none absolute -top-2 left-1/2 h-5 w-8 -translate-x-1/2 rounded-sm"
        />
      ) : null}
    </div>
  )

  return (
    <SmartlinkAudioGate
      previewAudioSrc={!preview ? previewAudioSrc : null}
      light={contentLight && isSheet}
      className={shellClass}
      style={
        {
          "--sl-accent": theme.accent,
          "--sl-accent-fg": accentText,
          fontFamily: fontStack,
        } as CSSProperties
      }
    >
      {isBlurBg ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
          <div
            aria-hidden
            className={cn(
              "absolute inset-0",
              isGlassCard || isFilm ? "bg-black/50" : "bg-black/55",
              isNeon && "bg-black/65",
            )}
          />
        </>
      ) : null}

      {isFilm ? <div aria-hidden className="sl-film-grain pointer-events-none absolute inset-0 z-[2]" /> : null}
      {isFilm ? <div aria-hidden className="sl-film-vignette pointer-events-none absolute inset-0 z-[2]" /> : null}
      {isVhs ? <div aria-hidden className="sl-vhs-scanlines pointer-events-none absolute inset-0 z-[2]" /> : null}
      {isHolo ? <div aria-hidden className="sl-holo-sheen pointer-events-none absolute inset-0 z-[2]" /> : null}
      {isRave ? <SmartlinkRaveBlobs /> : null}

      {isCinema ? (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[8%] bg-black" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[8%] bg-black" />
        </>
      ) : null}

      {!isBlurBg &&
      !isSheet &&
      !isCarbon &&
      !isArcade &&
      !isVhs &&
      !isNoir &&
      !isChrome &&
      !isPolaroid &&
      !isStamp ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background: isSunset
              ? `radial-gradient(70% 50% at 50% 0%, color-mix(in srgb, ${theme.accent} 45%, transparent), transparent 70%)`
              : `radial-gradient(60% 45% at 50% 0%, color-mix(in srgb, ${theme.accent} 35%, transparent), transparent 70%)`,
          }}
        />
      ) : null}

      <div className={cardClass}>
        {socialsAbove ? (
          <div className={animClass(theme)} style={animStyle(theme, animIndex++)}>
            <SocialRow items={socialItems} iconStyle={socials!.iconStyle} light={contentLight} />
          </div>
        ) : null}

        {coverBlock}

        {socialsBelow && !isPoster && !isPolaroid ? (
          <div className={animClass(theme)} style={animStyle(theme, animIndex++)}>
            <SocialRow items={socialItems} iconStyle={socials!.iconStyle} light={contentLight} />
          </div>
        ) : null}

        {!isPoster && !isPolaroid ? titleBlock : null}

        {(isPoster || isPolaroid) && socialsBelow ? (
          <div className={animClass(theme)} style={animStyle(theme, animIndex++)}>
            <SocialRow
              items={socialItems}
              iconStyle={socials!.iconStyle}
              light={contentLight || isPolaroid}
            />
          </div>
        ) : null}

        {renderLinks()}

        <a
          href={brandHref}
          className={cn(
            "mt-0.5 text-xs opacity-55 transition-opacity hover:opacity-100",
            contentLight ? "text-[#161616]" : "text-white",
            animClass(theme),
          )}
          style={animStyle(theme, animIndex++)}
        >
          {brandLabel}
        </a>
      </div>
    </SmartlinkAudioGate>
  )
}
