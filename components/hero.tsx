"use client"

import dynamic from "next/dynamic"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useI18n } from "@/lib/i18n-context"

const PartnerMarquee = dynamic(
  () => import("@/components/partner-marquee").then((m) => m.PartnerMarquee),
  { ssr: false, loading: () => <div className="mt-16 h-20" aria-hidden /> }
)

export function Hero() {
  const { t } = useI18n()
  const stats = (t.hero.stats ?? []) as Array<{ value: string; label: string }>
  const telegramUrl = t.hero.telegramUrl || "https://t.me/parallaxmusic_rt"
  const vkUrl = t.hero.vkUrl || "https://vk.com/parallaxmusic_releaseteam"
  const exploreLabel = t.hero.ctaExplore ?? "Смотреть возможности"
  const cabinetCta = t.hero.ctaCabinet ?? "Создать кабинет"

  return (
    <section
      id="about"
      className="relative flex min-h-screen items-center justify-center overflow-hidden pt-24 pb-12"
    >
      <div className="container z-10 mx-auto px-4 text-center">
        <div className="mx-auto max-w-4xl space-y-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/90 sm:text-sm">
            Parallax Music
          </p>

          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent whitespace-pre-line">
              {t.hero.title}
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground md:text-xl whitespace-pre-line">
            {t.hero.description}
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Button
              size="lg"
              className="w-full bg-primary px-8 uppercase tracking-wider text-primary-foreground hover:bg-primary/90 sm:w-auto"
              asChild
            >
              <Link href="/cabinet?tab=register" prefetch={false}>
                {cabinetCta}
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full border-border/70 bg-background/20 px-8 uppercase tracking-wider backdrop-blur-sm sm:w-auto"
              asChild
            >
              <Link href="/#paths">{exploreLabel}</Link>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full gap-2 uppercase tracking-wider text-muted-foreground hover:text-foreground sm:w-auto"
                >
                  {t.hero.ctaSecondary}
                  <ChevronDown className="h-4 w-4 opacity-90" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-[12rem]">
                <DropdownMenuItem asChild>
                  <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                    {t.hero.consultTelegram}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={vkUrl} target="_blank" rel="noopener noreferrer">
                    {t.hero.consultVk}
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {stats.length > 0 ? (
            <div className="mx-auto grid max-w-2xl grid-cols-3 gap-3 pt-2 md:gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <div className="text-2xl font-bold text-primary md:text-3xl">{stat.value}</div>
                  <div className="text-xs leading-snug text-muted-foreground md:text-sm">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <PartnerMarquee />
      </div>
    </section>
  )
}
