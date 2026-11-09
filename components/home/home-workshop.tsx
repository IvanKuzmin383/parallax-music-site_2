"use client"

import { useEffect, useRef, type ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight, AudioLines, Clapperboard, Gauge, type LucideIcon } from "lucide-react"
import { marketingGlassHoverClass, marketingGlassPanelClass } from "@/components/marketing/marketing-glass"
import { cabinetAuthHref } from "@/components/cabinet/shared/service-landing-mode"
import { ServicePriceText } from "@/components/cabinet/shared/service-price-text"
import { MasteringComparePlayer } from "@/components/home/mastering-compare-player"
import type { ServicePriceKey } from "@/lib/service-prices"
import { trackGoal } from "@/lib/analytics"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

const COVER_EXAMPLES = ["/aicover/example-04.webp", "/aicover/example-05.webp", "/aicover/example-08.webp"]

const SMARTLINK_PLATFORMS = [
  { icon: "yandex", ru: "Яндекс Музыка", en: "Yandex Music" },
  { icon: "vk", ru: "VK Музыка", en: "VK Music" },
  { icon: "spotify", ru: "Spotify", en: "Spotify" },
] as const

const FREE_TOOL_ICONS: Record<string, LucideIcon> = {
  mastering: AudioLines,
  "slowed-reverb": Gauge,
  snippet: Clapperboard,
}

const FREE_TOOL_PRICE_KEYS: Record<string, ServicePriceKey> = {
  mastering: "tools_mastering",
  "slowed-reverb": "tools_slowed_reverb",
  snippet: "tools_story_video",
}

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

/** Видео играет только в зоне видимости и не запускается при prefers-reduced-motion. */
function ViewportVideo({ src, poster }: { src: string; poster: string }) {
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
      className="aspect-[9/16] w-full rounded-[1.5rem] object-cover"
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

function ServiceTile({
  title,
  description,
  href,
  cta,
  badge,
  price,
  className,
  children,
}: {
  title: string
  description: string
  href: string
  cta: string
  badge: string
  price?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <article className={cn(marketingGlassPanelClass, "flex flex-col gap-5 overflow-hidden p-5 sm:p-6", className)}>
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h4 className="text-lg font-semibold">{title}</h4>
          <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {badge}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex-1">{children}</div>
      <div className="flex flex-wrap items-center justify-between gap-3">
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

        <div className="mb-14">
          <div className="mb-5 space-y-1">
            <h3 className="text-xl font-semibold md:text-2xl">{copy.free.title}</h3>
            <p className="text-sm text-muted-foreground md:text-base">{copy.free.description}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {copy.free.items.map((tool) => {
              const Icon = FREE_TOOL_ICONS[tool.id] ?? AudioLines
              const priceKey = FREE_TOOL_PRICE_KEYS[tool.id]
              return (
                <Link
                  key={tool.id}
                  href={cabinetAuthHref(tool.href, true)}
                  prefetch={false}
                  onClick={() => trackGoal("cta_register_click", { location: "free_tools", tool: tool.id.replace(/-/g, "_") })}
                  className={cn(marketingGlassPanelClass, marketingGlassHoverClass, "group flex flex-col gap-4 p-6")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      {copy.free.badge}
                    </span>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <h4 className="text-lg font-semibold">{tool.label}</h4>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    {priceKey ? (
                      <span className="text-sm text-muted-foreground">
                        {copy.free.then} <PriceLine priceKey={priceKey} />
                      </span>
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
          <div className="mb-5 space-y-1">
            <h3 className="text-xl font-semibold md:text-2xl">{paid.title}</h3>
            <p className="text-sm text-muted-foreground md:text-base">{paid.description}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <ServiceTile
              title={paid.covers.title}
              description={paid.covers.description}
              href="/features/ai-covers"
              cta={paid.covers.cta}
              badge={paid.order}
              price={<PriceLine priceKey="ai_cover" />}
              className="lg:col-span-2"
            >
              <div className="relative mx-auto flex h-40 max-w-[260px] items-center justify-center">
                {COVER_EXAMPLES.map((src, index) => (
                  <Image
                    key={src}
                    src={src}
                    alt=""
                    width={300}
                    height={300}
                    className={cn(
                      "absolute h-32 w-32 rounded-xl border border-border/50 object-cover shadow-xl",
                      index === 0 && "-translate-x-16 -rotate-6",
                      index === 1 && "z-10 scale-110",
                      index === 2 && "translate-x-16 rotate-6",
                    )}
                  />
                ))}
              </div>
            </ServiceTile>

            <ServiceTile
              title={paid.mastering.title}
              description={paid.mastering.description}
              href="/features/ai-mastering"
              cta={paid.mastering.cta}
              badge={paid.order}
              price={<PriceLine priceKey="ai_mastering" />}
              className="lg:col-span-2"
            >
              <div className="flex h-full items-center">
                <div className="w-full">
                  <MasteringComparePlayer beforeLabel={paid.mastering.before} afterLabel={paid.mastering.after} />
                </div>
              </div>
            </ServiceTile>

            <ServiceTile
              title={paid.videoshot.title}
              description={paid.videoshot.description}
              href="/features/video-shots"
              cta={paid.videoshot.cta}
              badge={paid.order}
              price={<PriceLine priceKey="yandex_videoshot" prefix={locale === "en" ? "from" : "от"} />}
              className="md:col-span-2 lg:col-span-2 lg:row-span-2"
            >
              <div className="mx-auto w-full max-w-[260px] rounded-[2rem] border border-border/60 bg-black p-2 shadow-2xl">
                <ViewportVideo src="/videoshot/example1.mp4" poster="/videoshot/example1-poster.jpg" />
              </div>
            </ServiceTile>

            <ServiceTile
              title={paid.smartlink.title}
              description={paid.smartlink.description}
              href={cabinetAuthHref("/cabinet/tools/smartlinks", true)}
              cta={paid.smartlink.cta}
              badge={paid.order}
              price={<PriceLine priceKey="tools_smartlink" prefix={locale === "en" ? "from" : "от"} />}
              className="lg:col-span-4"
            >
              <div className="mx-auto flex max-w-sm items-center gap-4 rounded-xl border border-border/40 bg-background/40 p-3">
                <Image
                  src="/aicover/example-02.webp"
                  alt=""
                  width={300}
                  height={300}
                  className="h-24 w-24 shrink-0 rounded-lg object-cover"
                />
                <ul className="min-w-0 flex-1 space-y-1.5">
                  {SMARTLINK_PLATFORMS.map((platform) => (
                    <li
                      key={platform.icon}
                      className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2 py-1.5 text-xs"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-white/90 p-0.5">
                        <img src={`/platforms/${platform.icon}.svg`} alt="" className="h-full w-full object-contain" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{platform[locale]}</span>
                      <span className="rounded-md bg-primary/15 px-2 py-0.5 font-medium text-primary">
                        {paid.smartlink.listen}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </ServiceTile>

            <ServiceTile
              title={paid.promotion.title}
              description={paid.promotion.description}
              href="/promotion"
              cta={paid.promotion.cta}
              badge={paid.order}
              price={<span className="text-sm text-muted-foreground">{paid.promotion.priceNote}</span>}
              className="md:col-span-2 lg:col-span-6"
            >
              <ul className="flex flex-wrap gap-2">
                {paid.promotion.chips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full border border-border/50 bg-background/40 px-3 py-1.5 text-sm"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </ServiceTile>
          </div>
        </div>
      </div>
    </section>
  )
}
