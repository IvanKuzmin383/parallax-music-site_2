"use client"

import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n-context"
import { trackGoal } from "@/lib/analytics"

const PartnerMarquee = dynamic(
  () => import("@/components/partner-marquee").then((m) => m.PartnerMarquee),
  { ssr: false, loading: () => <div className="mt-20 h-20" aria-hidden /> },
)

const RELEASE_PLATFORMS = ["yandex", "vk", "spotify", "apple-music"] as const

export function HomeHero() {
  const { t } = useI18n()
  const copy = t.home.hero

  return (
    <section id="about" className="relative overflow-hidden pb-12 pt-28 md:pt-32">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-10">
          <div className="space-y-7 text-center lg:text-left">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              {copy.eyebrow}
            </p>

            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
              {copy.title}{" "}
              <span className="bg-gradient-to-r from-primary to-[#ff6b8a] bg-clip-text text-transparent">
                {copy.titleHighlight}
              </span>
            </h1>

            <p className="mx-auto max-w-xl text-pretty text-lg text-muted-foreground lg:mx-0">
              {copy.description}
            </p>

            <ul className="mx-auto grid max-w-xl grid-cols-2 gap-x-4 gap-y-2 text-left text-sm lg:mx-0">
              {copy.points.map((point) => (
                <li key={point} className="flex items-center gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button size="lg" className="w-full gap-2 px-7 sm:w-auto" asChild>
                <Link
                  href="/cabinet?tab=register"
                  prefetch={false}
                  onClick={() => trackGoal("cta_register_click", { location: "hero" })}
                >
                  {copy.ctaPrimary}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full border-border/70 bg-background/20 px-7 backdrop-blur-sm sm:w-auto"
                asChild
              >
                <Link href="/features" onClick={() => trackGoal("cta_features_click", { location: "hero" })}>
                  {copy.ctaSecondary}
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[640px] lg:max-w-none">
            <div
              className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-primary/20 blur-3xl"
              aria-hidden
            />
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/50 p-1.5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="flex items-center gap-1.5 px-2.5 pb-1.5 pt-1" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <Image
                src="/marketing/cabinet-dashboard.webp"
                alt={copy.mockupAlt}
                width={1600}
                height={1000}
                priority
                sizes="(min-width: 1024px) 640px, 100vw"
                className="h-auto w-full rounded-xl"
              />
            </div>

            <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl border border-border/50 bg-card/80 p-2.5 pr-4 shadow-xl backdrop-blur-xl sm:-left-6">
              <Image
                src="/aicover/example-05.webp"
                alt=""
                width={56}
                height={56}
                className="h-14 w-14 rounded-lg object-cover"
              />
              <div className="space-y-1.5">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                  {copy.releaseStatus}
                </p>
                <div className="flex items-center gap-1.5">
                  {RELEASE_PLATFORMS.map((platform) => (
                    <span
                      key={platform}
                      className="flex h-6 w-6 items-center justify-center rounded-md bg-white/90 p-1"
                    >
                      <img src={`/platforms/${platform}.svg`} alt="" className="h-full w-full object-contain" />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <PartnerMarquee />
      </div>
    </section>
  )
}
