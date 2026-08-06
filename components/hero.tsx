"use client"

import dynamic from "next/dynamic"
import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { HeroBackgroundImage } from "@/components/hero-background-image"
import { useI18n } from "@/lib/i18n-context"

const PartnerMarquee = dynamic(
  () => import("@/components/partner-marquee").then((m) => m.PartnerMarquee),
  { ssr: false, loading: () => <div className="mt-20 h-20" aria-hidden /> }
)

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { t } = useI18n()
  const bullets = (t.hero.bullets ?? []) as string[]
  const stats = (t.hero.stats ?? []) as Array<{ value: string; label: string }>
  const telegramUrl = t.hero.telegramUrl || "https://t.me/parallaxmusic_rt"

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return

      const scrolled = window.scrollY
      const elements = containerRef.current.querySelectorAll(".parallax-layer")

      elements.forEach((element, index) => {
        const speed = (index + 1) * 0.15
        const yPos = -(scrolled * speed)
        ;(element as HTMLElement).style.transform = `translateY(${yPos}px)`
      })
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const scrollToPricing = () => {
    const pricingSection = document.getElementById("pricing")
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    window.location.hash = "pricing"
  }

  return (
    <section id="about" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <HeroBackgroundImage alt={t.hero.imageAlt || t.hero.partnerLogoAlt} />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
      </div>

      <div className="container mx-auto px-4 z-10 text-center pt-24 pb-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div ref={containerRef} className="relative">
            <div className="relative inline-block">
              <div
                className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold tracking-tight leading-tight text-pretty whitespace-pre-line"
                aria-hidden="true"
              >
                <span className="absolute inset-0 text-primary/20 blur-sm">{t.hero.title}</span>
              </div>
              <div
                className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold tracking-tight leading-tight text-pretty whitespace-pre-line"
                aria-hidden="true"
              >
                <span className="absolute inset-0 text-primary/40 blur-[2px] translate-x-1 translate-y-1">
                  {t.hero.title}
                </span>
              </div>
              <h1 className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold tracking-tight leading-tight text-pretty relative whitespace-pre-line">
                <span className="bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                  {t.hero.title}
                </span>
              </h1>
            </div>
          </div>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty whitespace-pre-line">
            {t.hero.description}
          </p>

          {bullets.length > 0 && (
            <ul className="max-w-2xl mx-auto space-y-2 text-left text-sm md:text-base text-foreground/90">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button
              size="lg"
              className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-8 w-full sm:w-auto"
              onClick={scrollToPricing}
            >
              {t.hero.workWithUs}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="uppercase tracking-wider px-8 w-full sm:w-auto border-border bg-background/40 backdrop-blur-sm"
              asChild
            >
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer">
                {t.hero.ctaSecondary}
              </a>
            </Button>
          </div>

          {stats.length > 0 && (
            <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-2xl mx-auto pt-4">
              {stats.map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground leading-snug">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <PartnerMarquee />
      </div>
    </section>
  )
}
