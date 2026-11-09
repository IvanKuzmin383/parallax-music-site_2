"use client"

import type { ReactNode } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { marketingGlassPanelClass } from "@/components/marketing/marketing-glass"
import { cabinetAuthHref } from "@/components/cabinet/shared/service-landing-mode"
import { MasteringComparePlayer } from "@/components/home/mastering-compare-player"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

const COVER_EXAMPLES = ["/aicover/example-04.webp", "/aicover/example-05.webp", "/aicover/example-08.webp"]

const SMARTLINK_PLATFORMS = [
  { icon: "yandex", ru: "Яндекс Музыка", en: "Yandex Music" },
  { icon: "vk", ru: "VK Музыка", en: "VK Music" },
  { icon: "spotify", ru: "Spotify", en: "Spotify" },
] as const

function BentoTile({
  title,
  description,
  href,
  cta,
  className,
  children,
}: {
  title: string
  description: string
  href: string
  cta: string
  className?: string
  children: ReactNode
}) {
  return (
    <article className={cn(marketingGlassPanelClass, "flex flex-col gap-5 overflow-hidden p-5 sm:p-6", className)}>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex-1">{children}</div>
      <Link
        href={href}
        prefetch={false}
        className="inline-flex items-center gap-1 self-start text-sm font-medium text-primary hover:underline"
      >
        {cta}
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </article>
  )
}

export function HomeBento() {
  const { t, locale } = useI18n()
  const copy = t.home.bento

  return (
    <section id="workshop" className="scroll-mt-20 py-20 md:py-28">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight md:text-5xl">
            {copy.title} <span className="text-primary">{copy.titleHighlight}</span>
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground md:text-lg">{copy.description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <BentoTile
            title={copy.stats.title}
            description={copy.stats.description}
            href="/distribution"
            cta={copy.stats.cta}
            className="md:col-span-2 lg:col-span-4"
          >
            <div className="overflow-hidden rounded-xl border border-border/40">
              <Image
                src="/marketing/cabinet-stats.webp"
                alt={copy.stats.alt}
                width={1600}
                height={1000}
                sizes="(min-width: 1024px) 760px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </BentoTile>

          <BentoTile
            title={copy.videoshot.title}
            description={copy.videoshot.description}
            href="/features/video-shots"
            cta={copy.videoshot.cta}
            className="lg:col-span-2 lg:row-span-2"
          >
            <div className="mx-auto w-full max-w-[260px] rounded-[2rem] border border-border/60 bg-black p-2 shadow-2xl">
              <video
                src="/videoshot/example1.mp4"
                poster="/videoshot/example1-poster.jpg"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
                className="aspect-[9/16] w-full rounded-[1.5rem] object-cover"
              />
            </div>
          </BentoTile>

          <BentoTile
            title={copy.covers.title}
            description={copy.covers.description}
            href="/features/ai-covers"
            cta={copy.covers.cta}
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
                    "absolute h-32 w-32 rounded-xl border border-border/50 object-cover shadow-xl transition-transform duration-300",
                    index === 0 && "-translate-x-16 -rotate-6",
                    index === 1 && "z-10 scale-110",
                    index === 2 && "translate-x-16 rotate-6",
                  )}
                />
              ))}
            </div>
          </BentoTile>

          <BentoTile
            title={copy.mastering.title}
            description={copy.mastering.description}
            href="/features/ai-mastering"
            cta={copy.mastering.cta}
            className="lg:col-span-2"
          >
            <div className="flex h-full items-center">
              <div className="w-full">
                <MasteringComparePlayer beforeLabel={copy.mastering.before} afterLabel={copy.mastering.after} />
              </div>
            </div>
          </BentoTile>

          <BentoTile
            title={copy.smartlink.title}
            description={copy.smartlink.description}
            href={cabinetAuthHref("/cabinet/tools/smartlinks", true)}
            cta={copy.smartlink.cta}
            className="lg:col-span-3"
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
                      {copy.smartlink.listen}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </BentoTile>

          <BentoTile
            title={copy.promotion.title}
            description={copy.promotion.description}
            href="/promotion"
            cta={copy.promotion.cta}
            className="md:col-span-2 lg:col-span-3"
          >
            <ul className="flex flex-wrap gap-2">
              {copy.promotion.chips.map((chip) => (
                <li
                  key={chip}
                  className="rounded-full border border-border/50 bg-background/40 px-3 py-1.5 text-sm"
                >
                  {chip}
                </li>
              ))}
            </ul>
          </BentoTile>
        </div>
      </div>
    </section>
  )
}
