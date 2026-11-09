"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowUpRight,
  AudioLines,
  Clapperboard,
  Gauge,
  Music2,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { marketingGlassHoverClass, marketingGlassPanelClass } from "@/components/marketing/marketing-glass"
import { cabinetAuthHref } from "@/components/cabinet/shared/service-landing-mode"
import { ServicePriceText } from "@/components/cabinet/shared/service-price-text"
import { MasteringComparePlayer } from "@/components/home/mastering-compare-player"
import { SmartlinkLivePreview } from "@/components/smartlink/smartlink-live-preview"
import type { ServicePriceKey } from "@/lib/service-prices"
import { trackGoal } from "@/lib/analytics"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

const COVER_EXAMPLES = ["/aicover/example-04.webp", "/aicover/example-05.webp", "/aicover/example-08.webp"]

const FREE_TOOL_ICONS: Record<string, LucideIcon> = {
  mastering: AudioLines,
  "slowed-reverb": Gauge,
  snippet: Clapperboard,
}

const FREE_TOOL_PRICE_KEYS: Record<string, ServicePriceKey> = {
  mastering: "tools_mastering",
  snippet: "tools_story_video",
}

const PUBLIC_FREE_TOOL_IDS = new Set(["slowed-reverb"])

/** Запасные подписи, пока цены не загрузились (актуальные приходят из каталога цен кабинета). */
const PRICE_FALLBACK = {
  tools_mastering: "100 ₽",
  tools_slowed_reverb: "100 ₽",
  tools_story_video: "100 ₽",
  ai_cover: "500 ₽",
  ai_mastering: "500 ₽ / трек",
  yandex_videoshot: "900 ₽",
  tools_smartlink: "490 ₽ / год",
} as const

function useInViewMotion(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setActive(false)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, active }
}

/** Видео играет только в зоне видимости и не запускается при prefers-reduced-motion. */
function ViewportVideo({ src, poster, className }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.35 },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      className={cn("aspect-[9/16] w-full object-cover", className)}
    />
  )
}

function PriceLine({ priceKey, prefix }: { priceKey: ServicePriceKey; prefix?: string }) {
  const fallback = PRICE_FALLBACK[priceKey as keyof typeof PRICE_FALLBACK] ?? ""
  return (
    <span className="inline-flex items-baseline gap-1 text-sm font-semibold text-primary">
      {prefix ? <span>{prefix}</span> : null}
      <ServicePriceText priceKey={priceKey} fallback={fallback} />
    </span>
  )
}

function CoverShuffleDemo() {
  const { ref, active } = useInViewMotion()
  const [front, setFront] = useState(1)

  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => {
      setFront((prev) => (prev + 1) % COVER_EXAMPLES.length)
    }, 2600)
    return () => window.clearInterval(id)
  }, [active])

  return (
    <div ref={ref} className="relative mx-auto flex h-[220px] w-full max-w-[280px] items-center justify-center">
      {COVER_EXAMPLES.map((src, index) => {
        const offset = (index - front + COVER_EXAMPLES.length) % COVER_EXAMPLES.length
        const isFront = offset === 0
        const isLeft = offset === COVER_EXAMPLES.length - 1
        const isRight = offset === 1
        return (
          <Image
            key={src}
            src={src}
            alt=""
            width={300}
            height={300}
            className={cn(
              "absolute h-36 w-36 rounded-2xl border border-border/50 object-cover shadow-xl transition-all duration-700 ease-out",
              isFront && "z-20 translate-x-0 scale-110 rotate-0",
              isLeft && "z-10 -translate-x-[4.5rem] -rotate-8 scale-95 opacity-80",
              isRight && "z-10 translate-x-[4.5rem] rotate-8 scale-95 opacity-80",
              !isFront && !isLeft && !isRight && "z-0 scale-75 opacity-0",
            )}
          />
        )
      })}
    </div>
  )
}

function VideoshotDemo({ tall = false }: { tall?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full items-center justify-center",
        tall ? "h-full min-h-[420px] max-w-[240px]" : "h-[220px] max-w-[200px]",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden border border-border/60 bg-black p-1.5 shadow-2xl",
          tall ? "w-[168px] rounded-[1.6rem]" : "w-[132px] rounded-[1.35rem]",
        )}
      >
        <div className="mb-1.5 flex items-center gap-1.5 px-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="h-1 flex-1 rounded-full bg-white/15" />
        </div>
        <ViewportVideo
          src="/videoshot/example1.mp4"
          poster="/videoshot/example1-poster.jpg"
          className={tall ? "rounded-[1.15rem]" : "rounded-[1rem]"}
        />
      </div>
    </div>
  )
}

function AiStudioDemo() {
  return (
    <div className="relative mx-auto flex h-[220px] w-full max-w-lg items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-primary/20 via-background/40 to-violet-500/15 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(240,31,67,0.22),transparent_55%)]" />
      <div className="relative flex w-full flex-col items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary ring-1 ring-primary/30">
          <Music2 className="h-5 w-5" aria-hidden />
        </span>
        <div className="flex h-16 w-full max-w-sm items-end justify-center gap-1.5 px-4">
          {[40, 70, 55, 90, 45, 80, 60, 95, 50, 75, 42, 88].map((h, i) => (
            <span
              key={i}
              className="w-2 rounded-full bg-primary/80"
              style={{ height: `${h}%`, opacity: 0.45 + (i % 5) * 0.1 }}
            />
          ))}
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">AI Studio</p>
      </div>
    </div>
  )
}

function DepositDemo() {
  return (
    <div className="relative mx-auto flex h-[220px] w-full max-w-lg items-center justify-center overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-amber-500/15 via-background/40 to-primary/10 p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(245,158,11,0.18),transparent_55%)]" />
      <div className="relative flex w-full flex-col items-center gap-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30">
          <ShieldCheck className="h-5 w-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">Справка о депонировании</p>
          <p className="text-xs text-muted-foreground">Дата · отпечаток файла · авторы</p>
        </div>
        <div className="w-full max-w-xs rounded-xl border border-border/50 bg-background/50 px-4 py-3 text-left text-[11px] text-muted-foreground">
          <p className="font-medium text-foreground/90">PRLX-DEP-000128</p>
          <p className="mt-1">Материалы зафиксированы на дату подачи</p>
        </div>
      </div>
    </div>
  )
}

function PromotionPulseDemo({ chips }: { chips: string[] }) {
  const { ref, active } = useInViewMotion()
  const [hot, setHot] = useState(0)

  useEffect(() => {
    if (!active || chips.length === 0) return
    const id = window.setInterval(() => {
      setHot((prev) => (prev + 1) % chips.length)
    }, 1800)
    return () => window.clearInterval(id)
  }, [active, chips.length])

  return (
    <div ref={ref} className="flex h-[220px] items-center">
      <ul className="flex flex-wrap content-center gap-2">
        {chips.map((chip, index) => {
          const on = index === hot
          return (
            <li
              key={chip}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-all duration-500",
                on
                  ? "border-primary/70 bg-primary/20 text-foreground shadow-[0_0_24px_rgba(240,31,67,0.25)] scale-105"
                  : "border-border/50 bg-background/40 text-muted-foreground",
              )}
            >
              {chip}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ServiceTile({
  title,
  description,
  href,
  cta,
  badge,
  price,
  className,
  mediaClassName,
  children,
}: {
  title: string
  description: string
  href: string
  cta: string
  badge: string
  price?: ReactNode
  className?: string
  mediaClassName?: string
  children: ReactNode
}) {
  return (
    <article
      className={cn(
        marketingGlassPanelClass,
        marketingGlassHoverClass,
        "flex h-full flex-col gap-4 overflow-hidden p-5 sm:p-6",
        className,
      )}
    >
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h4 className="text-lg font-semibold tracking-tight">{title}</h4>
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {badge}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className={cn("flex min-h-[220px] flex-1 items-center justify-center", mediaClassName)}>
        {children}
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/30 pt-4">
        {price ?? <span />}
        <Link
          href={href}
          prefetch={false}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {cta}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  )
}

export function HomeWorkshop() {
  const { t, locale } = useI18n()
  const copy = t.home.workshop
  const paid = copy.paid

  return (
    <section id="workshop" className="scroll-mt-20 py-16 md:py-24">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
            {copy.title} <span className="text-primary">{copy.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground md:text-lg">{copy.description}</p>
        </div>

        <div className="mb-16">
          <div className="mb-6 space-y-1">
            <h3 className="text-xl font-semibold md:text-2xl">{copy.free.title}</h3>
            <p className="text-sm text-muted-foreground md:text-base">{copy.free.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.free.items.map((tool) => {
              const Icon = FREE_TOOL_ICONS[tool.id] ?? AudioLines
              const priceKey = FREE_TOOL_PRICE_KEYS[tool.id]
              const isPublicFree = PUBLIC_FREE_TOOL_IDS.has(tool.id)
              const href = isPublicFree ? tool.href : cabinetAuthHref(tool.href, true)
              return (
                <Link
                  key={tool.id}
                  href={href}
                  prefetch={false}
                  onClick={() =>
                    trackGoal(isPublicFree ? "cta_features_click" : "cta_register_click", {
                      location: "free_tools",
                      tool: tool.id.replace(/-/g, "_"),
                    })
                  }
                  className={cn(
                    marketingGlassPanelClass,
                    marketingGlassHoverClass,
                    "group flex h-full flex-col gap-4 p-6",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      {isPublicFree ? copy.free.badgeFree : copy.free.badge}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h4 className="text-lg font-semibold">{tool.label}</h4>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border/30 pt-4">
                    {priceKey ? (
                      <span className="text-sm text-muted-foreground">
                        {copy.free.then} <PriceLine priceKey={priceKey} />
                      </span>
                    ) : isPublicFree ? (
                      <span className="text-sm font-medium text-primary">{copy.free.badgeFree}</span>
                    ) : (
                      <span />
                    )}
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                      {copy.free.cta}
                      <ArrowUpRight
                        className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div>
          <div className="mb-6 space-y-1">
            <h3 className="text-xl font-semibold md:text-2xl">{paid.title}</h3>
            <p className="text-sm text-muted-foreground md:text-base">{paid.description}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-3 xl:items-stretch">
            <div className="flex flex-col gap-4 xl:col-span-2">
              <ServiceTile
                title={paid.mastering.title}
                description={paid.mastering.description}
                href="/features/ai-mastering"
                cta={paid.mastering.cta}
                badge={paid.order}
                price={<PriceLine priceKey="ai_mastering" />}
              >
                <div className="flex h-[220px] w-full items-center">
                  <div className="w-full">
                    <MasteringComparePlayer
                      beforeLabel={paid.mastering.before}
                      afterLabel={paid.mastering.after}
                    />
                  </div>
                </div>
              </ServiceTile>

              <div className="grid flex-1 gap-4 md:grid-cols-3 md:items-stretch">
                <ServiceTile
                  title={paid.videoshot.title}
                  description={paid.videoshot.description}
                  href="/features/video-shots"
                  cta={paid.videoshot.cta}
                  badge={paid.order}
                  price={
                    <PriceLine
                      priceKey="yandex_videoshot"
                      prefix={locale === "en" ? "from" : "от"}
                    />
                  }
                  className="md:col-span-1"
                  mediaClassName="min-h-[420px]"
                >
                  <VideoshotDemo tall />
                </ServiceTile>

                <ServiceTile
                  title={paid.covers.title}
                  description={paid.covers.description}
                  href="/features/ai-covers"
                  cta={paid.covers.cta}
                  badge={paid.order}
                  price={<PriceLine priceKey="ai_cover" />}
                  className="md:col-span-2"
                  mediaClassName="min-h-[420px]"
                >
                  <CoverShuffleDemo />
                </ServiceTile>
              </div>
            </div>

            <ServiceTile
              title={paid.smartlink.title}
              description={paid.smartlink.description}
              href={cabinetAuthHref("/cabinet/tools/smartlinks", true)}
              cta={paid.smartlink.cta}
              badge={paid.order}
              price={<PriceLine priceKey="tools_smartlink" prefix={locale === "en" ? "from" : "от"} />}
              className="min-h-[560px] xl:min-h-full"
              mediaClassName="min-h-[460px]"
            >
              <SmartlinkLivePreview compact="lg" />
            </ServiceTile>

            <ServiceTile
              title={paid.promotion.title}
              description={paid.promotion.description}
              href="/promotion"
              cta={paid.promotion.cta}
              badge={paid.order}
              price={<span className="text-sm text-muted-foreground">{paid.promotion.priceNote}</span>}
              className="xl:col-span-3"
            >
              <PromotionPulseDemo chips={paid.promotion.chips} />
            </ServiceTile>

            <div className="grid gap-4 xl:col-span-3 xl:grid-cols-2">
              <ServiceTile
                title={paid.aiStudio.title}
                description={paid.aiStudio.description}
                href={cabinetAuthHref("/cabinet/ai/tracks", true)}
                cta={paid.aiStudio.cta}
                badge={paid.order}
                price={<span className="text-sm font-semibold text-primary">{paid.aiStudio.priceLabel}</span>}
              >
                <AiStudioDemo />
              </ServiceTile>

              <ServiceTile
                title={paid.deposit.title}
                description={paid.deposit.description}
                href={cabinetAuthHref("/cabinet/protect/deposit", true)}
                cta={paid.deposit.cta}
                badge={paid.deposit.soon}
                price={<span className="text-sm font-semibold text-primary">{paid.deposit.priceLabel}</span>}
              >
                <DepositDemo />
              </ServiceTile>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
