import type { CSSProperties } from "react"
import { SmartlinkPreviewAudio } from "@/components/smartlink/smartlink-preview-audio"
import {
  SOCIAL_ICON_SRC,
  SMARTLINK_SOCIALS,
  type SmartlinkSocialItem,
} from "@/lib/smartlink-socials"
import {
  SMARTLINK_FONT_META,
  contrastTextOnAccent,
  isLightSmartlinkPreset,
  smartlinkAnimationDurationMs,
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
  if (preset === "vinyl") return "rounded-full"
  if (preset === "cinema" || preset === "poster" || preset === "ticket") return "rounded-none"
  if (shape === "square") return "rounded-none"
  if (shape === "soft") return "rounded-[1.75rem]"
  return "rounded-xl"
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
  brandLabel = "Parallax Music",
  className,
  preview = false,
  previewAudioSrc = null,
}: SmartlinkLandingProps) {
  const preset = theme.preset
  const accentText = contrastTextOnAccent(theme.accent)
  const isSheet = isLightSmartlinkPreset(preset)
  const isTicket = preset === "ticket"
  /** Светлый текст внутри контента (лист / билет). */
  const contentLight = isSheet || isTicket
  const isBlurBg = preset === "blur" || preset === "glass" || preset === "film" || preset === "neon"
  const isGlassCard = preset === "glass"
  const isSignal = preset === "signal"
  const isTerminal = preset === "terminal"
  const isPoster = preset === "poster"
  const isVinyl = preset === "vinyl"
  const isCinema = preset === "cinema"
  const isCapsule = preset === "capsule"
  const isGrid = preset === "grid"
  const isNeon = preset === "neon"
  const isFilm = preset === "film"
  const isInkblot = preset === "inkblot"
  const isCarbon = preset === "carbon"
  const isSunset = preset === "sunset"

  const fontStack =
    isTerminal || isTicket
      ? SMARTLINK_FONT_META.mono.stack
      : (SMARTLINK_FONT_META[theme.font]?.stack ?? SMARTLINK_FONT_META.sans.stack)

  const socials = theme.socials
  const socialItems =
    socials?.enabled && socials.items.length > 0
      ? socials.items.filter((i) => i.url.trim())
      : []
  const socialsAbove = socialItems.length > 0 && socials?.position === "above"
  const socialsBelow = socialItems.length > 0 && socials?.position !== "above"

  const forceIcons = isVinyl || isGrid
  const iconsOnly = forceIcons || theme.platformLayout === "icons"

  const shellClass = cn(
    "relative flex min-h-full w-full flex-col items-center justify-center overflow-hidden",
    preview ? "min-h-[520px] px-3 py-6" : "min-h-screen p-4 sm:p-6",
    isSheet ? "bg-[#F3EFE6] text-[#161616]" : "bg-[#0B0B0C] text-[#F5F5F5]",
    isCarbon && "sl-carbon-bg",
    className,
  )

  const cardClass = cn(
    "relative z-[1] flex w-full flex-col items-center gap-4",
    preview ? "max-w-[280px]" : "max-w-md",
    isSheet && "rounded-2xl bg-white/90 px-4 py-6 shadow-[0_18px_50px_rgba(20,16,10,0.12)]",
    isSignal && "rounded-2xl border border-white/10 bg-black/35 px-4 py-6 backdrop-blur-md",
    isGlassCard &&
      "rounded-2xl border border-white/20 bg-white/10 px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl",
    isTicket && "sl-ticket-card px-4 py-6",
    isCinema && "gap-3 px-0",
    isCarbon && "rounded-2xl border border-white/10 bg-black/40 px-4 py-6 backdrop-blur-sm",
  )

  const useIcons = iconsOnly

  const buttonBase = cn(
    "inline-flex items-center font-medium no-underline transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97]",
    useIcons && !isVinyl
      ? "h-12 w-12 shrink-0 justify-center"
      : isVinyl
        ? "h-12 w-12 shrink-0 justify-center rounded-full"
        : isCapsule
          ? "h-12 w-full justify-between gap-3 rounded-full px-5 text-sm"
          : isCinema
            ? "h-12 w-full justify-center gap-3 rounded-none px-4 text-sm tracking-wide uppercase"
            : isTerminal
              ? "h-10 w-full justify-start gap-2 rounded-none border-0 border-b px-1 text-sm"
              : isPoster
                ? "h-10 w-full justify-center gap-2 rounded-none px-3 text-xs font-semibold uppercase tracking-wider"
                : "h-11 w-full justify-center gap-3 px-4 text-sm",
  )

  const useGlassButton =
    theme.buttons === "glass" || (isGlassCard && theme.buttons === "soft") || isFilm
  const fgOnPage = contentLight ? "#161616" : "#F5F5F5"

  const buttonClass = cn(
    buttonBase,
    !useIcons &&
      !isCapsule &&
      !isCinema &&
      !isTerminal &&
      !isPoster &&
      (isSignal && theme.buttons === "solid" ? "rounded-none" : isInkblot ? "sl-inkblot" : "rounded-xl"),
    isGrid && "rounded-lg",
    isNeon && "sl-neon-btn",
  )

  const buttonVisualStyle = (): CSSProperties => {
    const drop = theme.buttonShadow ? "0 10px 28px rgba(0,0,0,0.28)" : undefined

    if (isNeon) {
      return {
        backgroundColor: "transparent",
        color: theme.accent,
        border: `1.5px solid ${theme.accent}`,
        boxShadow: `0 0 16px color-mix(in srgb, ${theme.accent} 55%, transparent), inset 0 0 12px color-mix(in srgb, ${theme.accent} 18%, transparent)`,
      }
    }

    if (isSunset) {
      return {
        backgroundImage: `linear-gradient(135deg, ${theme.accent}, #0a0a0a 85%)`,
        color: "#FAFAFA",
        border: "1px solid transparent",
        boxShadow: drop,
      }
    }

    if (isTerminal) {
      return {
        backgroundColor: "transparent",
        color: fgOnPage,
        borderBottom: `1px solid color-mix(in srgb, ${fgOnPage} 22%, transparent)`,
        borderRadius: 0,
      }
    }

    if (isGrid) {
      return {
        backgroundColor: "transparent",
        color: fgOnPage,
        border: `1px solid color-mix(in srgb, ${fgOnPage} 28%, transparent)`,
        boxShadow: "none",
      }
    }

    if (isCarbon) {
      return {
        backgroundColor: "rgba(255,255,255,0.06)",
        color: fgOnPage,
        border: theme.buttonBorder
          ? "1px solid rgba(255,255,255,0.18)"
          : "1px solid transparent",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
      }
    }

    if (useGlassButton) {
      return {
        backgroundColor: contentLight ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.12)",
        color: fgOnPage,
        border: theme.buttonBorder
          ? contentLight
            ? "1px solid rgba(22,22,22,0.14)"
            : "1px solid rgba(255,255,255,0.28)"
          : "1px solid transparent",
        boxShadow: drop
          ? `${drop}, inset 0 1px 0 rgba(255,255,255,0.25)`
          : "inset 0 1px 0 rgba(255,255,255,0.25)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }
    }

    if (theme.buttons === "outline" || isTicket) {
      return {
        backgroundColor: "transparent",
        color: fgOnPage,
        border: theme.buttonBorder
          ? `1.5px solid ${theme.accent}`
          : `1.5px solid color-mix(in srgb, ${fgOnPage} 35%, transparent)`,
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
          : "1px solid transparent",
        boxShadow: drop,
      }
    }

    return {
      backgroundColor: theme.accent,
      color: accentText,
      border: theme.buttonBorder
        ? `1px solid color-mix(in srgb, ${accentText} 18%, transparent)`
        : "1px solid transparent",
      borderLeftWidth: !useIcons && isSignal && theme.buttonBorder ? 4 : undefined,
      borderLeftColor: !useIcons && isSignal && theme.buttonBorder ? theme.accent : undefined,
      boxShadow: isInkblot ? undefined : drop,
    }
  }

  let animIndex = 0
  const coverMax = preview ? "max-w-[190px]" : "max-w-[280px]"
  const posterCoverMax = preview ? "max-w-[240px]" : "max-w-[320px]"

  const renderLinks = () => {
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
            : isPoster
              ? "flex flex-col gap-1"
              : isTerminal
                ? "flex flex-col"
                : "flex flex-col gap-1.5",
        )}
      >
        {links.map((link) => {
          const i = animIndex++
          return (
            <a
              key={link.key}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              title={link.label}
              aria-label={link.label}
              className={cn(buttonClass, animClass(theme))}
              style={{
                ...buttonVisualStyle(),
                ...animStyle(theme, i),
              }}
            >
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
        )}
      >
        {title}
      </h1>
      <p
        className={cn(
          "opacity-70",
          preview ? "text-sm" : "text-base sm:text-lg",
          isTerminal && "text-xs opacity-50",
        )}
      >
        {artist}
      </p>
    </div>
  )

  const coverBlock = (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden bg-black/20",
        isPoster ? posterCoverMax : coverMax,
        coverRadiusClass(theme.cover, preset),
        theme.coverShadow && !isCinema && "shadow-[0_18px_40px_rgba(0,0,0,0.45)]",
        isSignal && "ring-2 ring-[var(--sl-accent)]",
        isVinyl && "sl-vinyl-disc ring-4 ring-black/40",
        animClass(theme),
      )}
      style={{
        ...animStyle(theme, animIndex++),
        ...(isNeon
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
    </div>
  )

  return (
    <div
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

      {isCinema ? (
        <>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[8%] bg-black" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[8%] bg-black" />
        </>
      ) : null}

      {!isBlurBg && !isSheet && !isCarbon ? (
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

      {!preview && previewAudioSrc ? (
        <div className="absolute right-3 top-3 z-20 sm:right-5 sm:top-5">
          <SmartlinkPreviewAudio src={previewAudioSrc} light={contentLight && isSheet} />
        </div>
      ) : null}

      <div className={cardClass}>
        {socialsAbove ? (
          <div className={animClass(theme)} style={animStyle(theme, animIndex++)}>
            <SocialRow items={socialItems} iconStyle={socials!.iconStyle} light={contentLight} />
          </div>
        ) : null}

        {coverBlock}

        {socialsBelow && !isPoster ? (
          <div className={animClass(theme)} style={animStyle(theme, animIndex++)}>
            <SocialRow items={socialItems} iconStyle={socials!.iconStyle} light={contentLight} />
          </div>
        ) : null}

        {!isPoster ? titleBlock : null}

        {isPoster && socialsBelow ? (
          <div className={animClass(theme)} style={animStyle(theme, animIndex++)}>
            <SocialRow items={socialItems} iconStyle={socials!.iconStyle} light={contentLight} />
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
    </div>
  )
}
