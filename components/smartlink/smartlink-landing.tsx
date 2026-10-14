import type { CSSProperties } from "react"
import { PLATFORM_ICON_SRC } from "@/lib/smartlink-platforms"
import {
  contrastTextOnAccent,
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
  /** Компактный режим для превью в редакторе */
  preview?: boolean
}

function coverRadiusClass(shape: SmartlinkTheme["cover"]) {
  if (shape === "square") return "rounded-none"
  if (shape === "soft") return "rounded-[1.75rem]"
  return "rounded-xl"
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
  const isBlur = theme.preset === "blur"

  const shellClass = cn(
    "relative flex min-h-full w-full flex-col items-center justify-center overflow-hidden",
    preview ? "min-h-[520px] px-4 py-8" : "min-h-screen p-4 sm:p-6",
    isSheet ? "bg-[#F3EFE6] text-[#161616]" : "bg-[#0B0B0C] text-[#F5F5F5]",
    className,
  )

  const cardClass = cn(
    "relative z-[1] flex w-full flex-col items-center gap-5",
    preview ? "max-w-[280px]" : "max-w-md",
    isSheet && "rounded-2xl bg-white/90 px-5 py-7 shadow-[0_18px_50px_rgba(20,16,10,0.12)]",
    isSignal && "rounded-2xl border border-white/10 bg-black/35 px-5 py-7 backdrop-blur-md",
  )

  const buttonBase =
    "inline-flex w-full items-center justify-center gap-3 px-4 text-sm font-medium transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"

  const buttonClass = (() => {
    if (theme.buttons === "outline") {
      return cn(
        buttonBase,
        "h-12 rounded-xl border bg-transparent",
        isSheet ? "border-[#161616]/20 text-[#161616]" : "border-white/25 text-white",
      )
    }
    if (theme.buttons === "soft") {
      return cn(
        buttonBase,
        "h-12 rounded-xl",
        isSheet ? "bg-black/5 text-[#161616]" : "bg-white/10 text-white",
      )
    }
    if (isSignal) {
      return cn(buttonBase, "h-12 rounded-none border-l-4")
    }
    return cn(buttonBase, "h-12 rounded-xl")
  })()

  return (
    <div
      className={shellClass}
      style={
        {
          "--sl-accent": theme.accent,
          "--sl-accent-fg": accentText,
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
          <div aria-hidden className="absolute inset-0 bg-black/55" />
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
        <div
          className={cn(
            "aspect-square w-full overflow-hidden bg-black/20 shadow-xl",
            preview ? "max-w-[200px]" : "max-w-[280px]",
            coverRadiusClass(theme.cover),
            isSignal && "ring-2 ring-[var(--sl-accent)]",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt={title}
            className="h-full w-full object-cover"
            sizes={preview ? "200px" : "280px"}
          />
        </div>

        <div className="w-full space-y-1 text-center">
          <h1
            className={cn(
              "font-semibold tracking-tight",
              preview ? "text-xl" : "text-2xl sm:text-[1.7rem]",
            )}
          >
            {title}
          </h1>
          <p className={cn("opacity-70", preview ? "text-sm" : "text-base sm:text-lg")}>{artist}</p>
        </div>

        {links.length > 0 ? (
          <div className="flex w-full flex-col gap-2">
            {links.map(({ key, label, url }) => (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClass}
                style={
                  theme.buttons === "solid"
                    ? {
                        backgroundColor: "var(--sl-accent)",
                        color: "var(--sl-accent-fg)",
                        borderLeftColor: isSignal ? "var(--sl-accent)" : undefined,
                      }
                    : theme.buttons === "outline" || theme.buttons === "soft"
                      ? { boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${theme.accent} 35%, transparent)` }
                      : undefined
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PLATFORM_ICON_SRC[key]}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0 rounded-[22%] object-contain"
                  loading="lazy"
                  decoding="async"
                />
                <span>{label}</span>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm opacity-60">Ссылки на площадки скоро появятся</p>
        )}

        <a
          href={brandHref}
          className={cn(
            "mt-1 text-sm opacity-55 transition-opacity hover:opacity-100",
            isSheet ? "text-[#161616]" : "text-white",
          )}
        >
          {brandLabel}
        </a>
      </div>
    </div>
  )
}
