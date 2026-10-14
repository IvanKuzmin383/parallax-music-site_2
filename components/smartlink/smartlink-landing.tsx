import type { CSSProperties } from "react"
import {
  SOCIAL_ICON_SRC,
  SMARTLINK_SOCIALS,
  type SmartlinkSocialItem,
} from "@/lib/smartlink-socials"
import {
  SMARTLINK_FONT_META,
  contrastTextOnAccent,
  smartlinkAnimationDurationMs,
  type SmartlinkLinkItem,
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
}

function coverRadiusClass(shape: SmartlinkTheme["cover"]) {
  if (shape === "square") return "rounded-none"
  if (shape === "soft") return "rounded-[1.75rem]"
  return "rounded-xl"
}

function animClass(theme: SmartlinkTheme, index = 0) {
  if (theme.animation === "none") return undefined
  return cn(`sl-anim-${theme.animation}`)
}

function animStyle(theme: SmartlinkTheme, index = 0): CSSProperties | undefined {
  if (theme.animation === "none") return undefined
  return {
    ["--sl-anim-ms" as string]: `${smartlinkAnimationDurationMs(theme.animationSpeed)}ms`,
    ["--sl-anim-i" as string]: String(index),
  }
}

function SocialRow({
  items,
  iconStyle,
  isSheet,
}: {
  items: SmartlinkSocialItem[]
  iconStyle: NonNullable<SmartlinkTheme["socials"]>["iconStyle"]
  isSheet: boolean
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
                cn("h-9 w-9 rounded-full", isSheet ? "bg-black/8" : "bg-white/15"),
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
}: SmartlinkLandingProps) {
  const accentText = contrastTextOnAccent(theme.accent)
  const isSheet = theme.preset === "sheet"
  const isSignal = theme.preset === "signal"
  const isBlur = theme.preset === "blur" || theme.preset === "glass"
  const isGlassPreset = theme.preset === "glass"
  const fontStack = SMARTLINK_FONT_META[theme.font]?.stack ?? SMARTLINK_FONT_META.sans.stack
  const socials = theme.socials
  const socialItems =
    socials?.enabled && socials.items.length > 0
      ? socials.items.filter((i) => i.url.trim())
      : []
  const socialsAbove = socialItems.length > 0 && socials?.position === "above"
  const socialsBelow = socialItems.length > 0 && socials?.position !== "above"

  const shellClass = cn(
    "relative flex min-h-full w-full flex-col items-center justify-center overflow-hidden",
    preview ? "min-h-[520px] px-3 py-6" : "min-h-screen p-4 sm:p-6",
    isSheet ? "bg-[#F3EFE6] text-[#161616]" : "bg-[#0B0B0C] text-[#F5F5F5]",
    className,
  )

  const cardClass = cn(
    "relative z-[1] flex w-full flex-col items-center gap-4",
    preview ? "max-w-[280px]" : "max-w-md",
    isSheet && "rounded-2xl bg-white/90 px-4 py-6 shadow-[0_18px_50px_rgba(20,16,10,0.12)]",
    isSignal && "rounded-2xl border border-white/10 bg-black/35 px-4 py-6 backdrop-blur-md",
    isGlassPreset &&
      "rounded-2xl border border-white/20 bg-white/10 px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-xl",
  )

  const buttonBase =
    "inline-flex w-full items-center justify-center gap-3 px-4 text-sm font-medium transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"

  const useGlassButton = theme.buttons === "glass" || (isGlassPreset && theme.buttons === "soft")

  const buttonClass = (() => {
    if (useGlassButton) {
      return cn(
        buttonBase,
        "h-11 rounded-xl border border-white/25 bg-white/12 text-inherit backdrop-blur-md",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
        !theme.buttonBorder && "border-transparent",
      )
    }
    if (theme.buttons === "outline") {
      return cn(
        buttonBase,
        "h-11 rounded-xl bg-transparent",
        theme.buttonBorder
          ? isSheet
            ? "border border-[#161616]/20 text-[#161616]"
            : "border border-white/25 text-white"
          : "border border-transparent",
      )
    }
    if (theme.buttons === "soft") {
      return cn(
        buttonBase,
        "h-11 rounded-xl",
        isSheet ? "bg-black/5 text-[#161616]" : "bg-white/10 text-white",
        theme.buttonBorder && "border border-white/15",
      )
    }
    if (isSignal) {
      return cn(
        buttonBase,
        "h-11 rounded-none",
        theme.buttonBorder ? "border-l-4" : "border-l-0",
      )
    }
    return cn(
      buttonBase,
      "h-11 rounded-xl",
      theme.buttonBorder && "border border-black/10",
    )
  })()

  const buttonShadowStyle = theme.buttonShadow
    ? { boxShadow: "0 10px 28px rgba(0,0,0,0.28)" }
    : undefined

  let animIndex = 0

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
      {isBlur ? (
        <>
          <div
            aria-hidden
            className="absolute inset-0 scale-110 bg-cover bg-center blur-2xl"
            style={{ backgroundImage: `url(${coverUrl})` }}
          />
          <div
            aria-hidden
            className={cn("absolute inset-0", isGlassPreset ? "bg-black/45" : "bg-black/55")}
          />
        </>
      ) : null}
      {!isBlur && !isSheet ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background: `radial-gradient(60% 45% at 50% 0%, color-mix(in srgb, ${theme.accent} 35%, transparent), transparent 70%)`,
          }}
        />
      ) : null}

      <div className={cardClass}>
        {socialsAbove ? (
          <div className={animClass(theme, animIndex)} style={animStyle(theme, animIndex++)}>
            <SocialRow items={socialItems} iconStyle={socials!.iconStyle} isSheet={isSheet} />
          </div>
        ) : null}

        <div
          className={cn(
            "aspect-square w-full overflow-hidden bg-black/20",
            preview ? "max-w-[190px]" : "max-w-[280px]",
            coverRadiusClass(theme.cover),
            theme.coverShadow && "shadow-[0_18px_40px_rgba(0,0,0,0.45)]",
            isSignal && "ring-2 ring-[var(--sl-accent)]",
            animClass(theme, animIndex),
          )}
          style={animStyle(theme, animIndex++)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover"
            sizes={preview ? "190px" : "280px"}
          />
        </div>

        {socialsBelow ? (
          <div className={animClass(theme, animIndex)} style={animStyle(theme, animIndex++)}>
            <SocialRow items={socialItems} iconStyle={socials!.iconStyle} isSheet={isSheet} />
          </div>
        ) : null}

        <div
          className={cn("w-full space-y-0.5 text-center", animClass(theme, animIndex))}
          style={animStyle(theme, animIndex++)}
        >
          <h1
            className={cn(
              "font-semibold tracking-tight",
              preview ? "text-lg" : "text-2xl sm:text-[1.7rem]",
            )}
          >
            {title}
          </h1>
          <p className={cn("opacity-70", preview ? "text-sm" : "text-base sm:text-lg")}>{artist}</p>
        </div>

        {links.length > 0 ? (
          <div className="flex w-full flex-col gap-1.5">
            {links.map((link) => {
              const i = animIndex++
              return (
                <a
                  key={link.key}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonClass, animClass(theme, i))}
                  style={{
                    ...animStyle(theme, i),
                    ...buttonShadowStyle,
                    ...(theme.buttons === "solid" && !useGlassButton
                      ? {
                          backgroundColor: "var(--sl-accent)",
                          color: "var(--sl-accent-fg)",
                          borderLeftColor: isSignal ? "var(--sl-accent)" : undefined,
                        }
                      : theme.buttons === "outline" || theme.buttons === "soft"
                        ? theme.buttonBorder
                          ? {
                              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${theme.accent} 35%, transparent)`,
                            }
                          : undefined
                        : undefined),
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={link.iconSrc}
                    alt=""
                    width={22}
                    height={22}
                    className="h-5 w-5 shrink-0 rounded-[22%] object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                  <span>{link.label}</span>
                </a>
              )
            })}
          </div>
        ) : (
          <p className="text-center text-sm opacity-60">Ссылки на площадки скоро появятся</p>
        )}

        <a
          href={brandHref}
          className={cn(
            "mt-0.5 text-xs opacity-55 transition-opacity hover:opacity-100",
            isSheet ? "text-[#161616]" : "text-white",
            animClass(theme, animIndex),
          )}
          style={animStyle(theme, animIndex++)}
        >
          {brandLabel}
        </a>
      </div>
    </div>
  )
}
