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

  const handleWorkWithUsClick = () => {
    window.location.href = "https://parallaxmusic.ru/#pricing"
  }

  return (
    <section id="about" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <HeroBackgroundImage alt="Professional music studio with recording equipment in dark moody atmosphere" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 z-10 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Parallax text layers with echo effect */}
          <div ref={containerRef} className="relative">
            <div className="relative inline-block">
              {/* Echo layer 1 - farthest, most blurred (decorative only) */}
              <div 
                className="parallax-layer text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-tight leading-tight md:leading-none whitespace-normal md:whitespace-nowrap"
                aria-hidden="true"
              >
                <span className="absolute inset-0 text-primary/20 blur-sm">{t.hero.title}</span>
              </div>
              {/* Echo layer 2 - middle (decorative only) */}
              <div 
                className="parallax-layer text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-tight leading-tight md:leading-none whitespace-normal md:whitespace-nowrap"
                aria-hidden="true"
              >
                <span className="absolute inset-0 text-primary/40 blur-[2px] translate-x-1 translate-y-1">
                  {t.hero.title}
                </span>
              </div>
              {/* Main layer - gradient text (SEO-friendly h1) */}
              <h1 className="parallax-layer text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-serif font-bold tracking-tight leading-tight md:leading-none whitespace-normal md:whitespace-nowrap relative">
                <span className="bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                  {t.hero.title}
                </span>
              </h1>
            </div>
          </div>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty whitespace-pre-line">
            {t.hero.description}
          </p>
          <div className="flex items-center justify-center">
            <Button
              size="lg"
              className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-8"
              onClick={handleWorkWithUsClick}
            >
              {t.hero.workWithUs}
            </Button>
          </div>
        </div>

        <PartnerMarquee />
      </div>
    </section>
  )
}
