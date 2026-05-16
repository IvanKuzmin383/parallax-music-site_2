"use client"

import { useRef, useEffect } from "react"
import Image from "next/image"
import { Network, ListMusic, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Pricing } from "@/components/pricing"
import { FaqSection } from "@/components/faq-section"
import { Contact } from "@/components/contact"
import { useI18n } from "@/lib/i18n-context"
import { PartnerMarquee } from "@/components/partner-marquee"

export function AiLanding() {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)

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

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleScrollToPricing = () => {
    const pricingSection = document.getElementById("pricing")
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  const steps = t.aiLanding.steps.items as Array<{
    id: string
    title: string
    description: string
  }>

  return (
    <>
      {/* Hero section */}
      <section id="about-ai" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/music-studio-recording-session-dark-moody-atmosphe.jpg"
            alt={t.aiLanding.hero.imageAlt}
            fill
            className="object-cover opacity-30"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 z-10 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Parallax text layers with echo effect */}
            <div ref={containerRef} className="relative">
              <div className="relative inline-block">
                {/* Echo layer 1 */}
                <div
                  className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold tracking-tight leading-tight text-pretty whitespace-pre-line"
                  aria-hidden="true"
                >
                  <span className="absolute inset-0 text-primary/20 blur-sm">
                    {t.aiLanding.hero.title}
                  </span>
                </div>
                {/* Echo layer 2 */}
                <div
                  className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold tracking-tight leading-tight text-pretty whitespace-pre-line"
                  aria-hidden="true"
                >
                  <span className="absolute inset-0 text-primary/40 blur-[2px] translate-x-1 translate-y-1">
                    {t.aiLanding.hero.title}
                  </span>
                </div>
                {/* Main layer - SEO-friendly h1 */}
                <h1 className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold tracking-tight leading-tight text-pretty relative whitespace-pre-line">
                  <span className="bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                    {t.aiLanding.hero.title}
                  </span>
                </h1>
              </div>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty whitespace-pre-line">
              {t.aiLanding.hero.subtitle}
            </p>
            <div className="flex items-center justify-center">
              <Button
                size="lg"
                className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                onClick={handleScrollToPricing}
              >
                {t.aiLanding.hero.cta}
              </Button>
            </div>
          </div>

          <PartnerMarquee />
        </div>
      </section>

      {/* AI Services section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              {t.aiLanding.aiServices.titleHighlight ? (
                <>
                  <span className="text-foreground">{t.aiLanding.aiServices.title}</span>{" "}
                  <span className="text-primary">{t.aiLanding.aiServices.titleHighlight}</span>
                </>
              ) : (
                <span className="text-foreground">{t.aiLanding.aiServices.title}</span>
              )}
            </h2>
            <p className="text-lg text-muted-foreground text-pretty">{t.aiLanding.aiServices.description}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-card border-border hover:border-primary transition-all duration-300 group">
              <div className="mb-4">
                <Network className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">{t.aiLanding.aiServices.distribution.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{t.aiLanding.aiServices.distribution.description}</p>
            </Card>

            <Card className="p-6 bg-card border-border hover:border-primary transition-all duration-300 group">
              <div className="mb-4">
                <ListMusic className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">{t.aiLanding.aiServices.playlistPitching.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{t.aiLanding.aiServices.playlistPitching.description}</p>
            </Card>

            <Card className="p-6 bg-card border-border hover:border-primary transition-all duration-300 group">
              <div className="mb-4">
                <FileText className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">{t.aiLanding.aiServices.consulting.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{t.aiLanding.aiServices.consulting.description}</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing (reuse existing component) */}
      <Pricing />

      {/* Steps */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-foreground">{t.aiLanding.steps.title}</span>
            </h2>
            <p className="text-lg text-muted-foreground text-pretty">{t.aiLanding.steps.description}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
            {steps.map((step, index) => (
              <div key={step.id} className="space-y-4">
                <div className="text-6xl font-bold text-primary opacity-50">0{index + 1}</div>
                <h3 className="text-2xl font-bold uppercase tracking-wide">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <FaqSection />

      {/* Contact form (reuse global contact) */}
      <Contact />
    </>
  )
}

