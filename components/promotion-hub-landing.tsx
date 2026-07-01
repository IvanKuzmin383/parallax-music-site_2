"use client"

import { useRef, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Rocket } from "lucide-react"
import { HeroBackgroundImage } from "@/components/hero-background-image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { PromotionOrderDialog } from "@/components/promotion-order-dialog"
import { PartnerMarquee } from "@/components/partner-marquee"
import { useI18n } from "@/lib/i18n-context"

export function PromotionHubLanding() {
  const { t } = useI18n()
  const hub = t.promotionLanding.hub
  const shared = t.promotionLanding
  const containerRef = useRef<HTMLDivElement>(null)
  const [orderOpen, setOrderOpen] = useState(false)

  const services = hub.services as Array<{
    id: string
    slug: string
    title: string
    description: string
  }>

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return
      const scrolled = window.scrollY
      containerRef.current.querySelectorAll(".parallax-layer").forEach((element, index) => {
        const speed = (index + 1) * 0.15
        ;(element as HTMLElement).style.transform = `translateY(${-(scrolled * speed)}px)`
      })
    }
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <>
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <HeroBackgroundImage alt={shared.hero.imageAlt} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/55 to-background" />
        </div>

        <div className="container mx-auto px-4 z-10 text-center py-28 md:py-32">
          <div className="max-w-4xl mx-auto space-y-8">
            <div ref={containerRef} className="relative">
              <h1 className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight">
                <span className="text-foreground">{hub.title}</span>{" "}
                <span className="text-primary">{hub.titleHighlight}</span>
              </h1>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">{hub.subtitle}</p>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">{hub.tagline}</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-8 gap-2"
                onClick={() => setOrderOpen(true)}
              >
                <Rocket className="h-4 w-4" aria-hidden />
                {shared.hero.cta}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="uppercase tracking-wider px-8"
                onClick={() =>
                  document.getElementById("promotion-services")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                {shared.hero.ctaServices}
              </Button>
            </div>
          </div>
          <PartnerMarquee />
        </div>
      </section>

      <section id="promotion-services" className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16 mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">{hub.servicesTitle}</h2>
            <p className="text-lg text-muted-foreground">{hub.servicesDescription}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <Card
                key={service.id}
                className="p-6 bg-card border-border hover:border-primary transition-all duration-300 group flex flex-col"
              >
                <h3 className="text-lg font-bold mb-3 uppercase tracking-wide group-hover:text-primary transition-colors">
                  {service.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed flex-1 text-sm">{service.description}</p>
                <Button variant="ghost" className="mt-6 justify-start px-0 hover:bg-transparent" asChild>
                  <Link href={`/promotion/${service.slug}`}>
                    {shared.hero.cta}
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/promotion/first-listeners">
                {t.promotionLanding.pages["first-listeners"].title}{" "}
                {t.promotionLanding.pages["first-listeners"].titleHighlight}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-background/60 border-t border-border">
        <div className="container mx-auto px-4 max-w-5xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">{hub.casesTitle}</h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">{hub.casesDescription}</p>
          <Button asChild>
            <Link href={hub.casesHref}>
              {hub.casesLink}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="py-16 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto rounded-2xl border border-primary/40 bg-card/40 p-6 md:p-8 flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
            <Rocket className="h-8 w-8 text-primary shrink-0" aria-hidden />
            <p className="text-muted-foreground flex-1">{hub.ctaCaption}</p>
            <Button onClick={() => setOrderOpen(true)} className="shrink-0 uppercase tracking-wider">
              {hub.finalCta.cta}
            </Button>
          </div>
        </div>
      </section>

      <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">{hub.finalCta.title}</h2>
            <p className="text-lg text-muted-foreground">{hub.finalCta.description}</p>
            <Button
              size="lg"
              className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-12"
              onClick={() => setOrderOpen(true)}
            >
              {hub.finalCta.cta}
            </Button>
          </div>
        </div>
      </section>

      <PromotionOrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        prefillMessage={hub.orderPrefill}
      />
    </>
  )
}
