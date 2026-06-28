"use client"

import { useRef, useEffect, useState, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Music,
  Globe,
  Wallet,
  Check,
  Mail,
  Copy,
} from "lucide-react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { HeroBackgroundImage } from "@/components/hero-background-image"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useI18n } from "@/lib/i18n-context"
import { PartnerMarquee } from "@/components/partner-marquee"

const STIHI_VARIANTS = ["hear", "write", "worthy", "income"] as const
type StihiVariant = (typeof STIHI_VARIANTS)[number]

const TELEGRAM_URL = "https://t.me/parallaxmusic_rt"
const VK_URL = "https://vk.com/parallaxmusic_releaseteam"
const EMAIL = "parallaxmusiclabel@gmail.com"

function TelegramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  )
}

function VkIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.847 2.462 2.253 4.624 2.836 4.624.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.154-3.574 2.154-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.203.339-.271.508 0 .847.203.271.847 1.017 1.287 1.677.847 1.186 1.49 2.186 1.662 2.677.17.491-.085.744-.576.744z" />
    </svg>
  )
}

function isStihiVariant(value: string | null): value is StihiVariant {
  return value !== null && STIHI_VARIANTS.includes(value as StihiVariant)
}

function OrderDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useI18n()
  const dialog = t.stihiLanding.orderDialog
  const [emailCopied, setEmailCopied] = useState(false)

  const telegramHref = `${TELEGRAM_URL}?text=${encodeURIComponent(dialog.prefillMessage)}`

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL)
      toast.success(dialog.emailCopied)
      setEmailCopied(true)
      window.setTimeout(() => setEmailCopied(false), 2000)
    } catch {
      toast.error(dialog.emailCopyError)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialog.title}</DialogTitle>
          <DialogDescription>{dialog.description}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button asChild size="lg" className="w-full justify-start gap-3 h-auto py-4">
            <a href={telegramHref} target="_blank" rel="noopener noreferrer">
              <TelegramIcon size={22} />
              {dialog.telegram}
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full justify-start gap-3 h-auto py-4">
            <a href={VK_URL} target="_blank" rel="noopener noreferrer">
              <VkIcon size={22} />
              {dialog.vk}
            </a>
          </Button>
          <div className="rounded-lg border border-border bg-card/60 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Mail className="size-5 shrink-0 text-primary" aria-hidden />
              <a
                href={`mailto:${EMAIL}`}
                className="text-sm font-medium break-all hover:text-primary transition-colors"
              >
                {EMAIL}
              </a>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 gap-2"
              onClick={() => void handleCopyEmail()}
            >
              {emailCopied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {emailCopied ? dialog.emailCopied : dialog.copyEmail}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StihiLandingContent() {
  const { t } = useI18n()
  const searchParams = useSearchParams()
  const containerRef = useRef<HTMLDivElement>(null)
  const [orderOpen, setOrderOpen] = useState(false)

  const variantKey = searchParams.get("v")
  const defaultVariant = t.stihiLanding.defaultVariant as StihiVariant
  const activeVariant: StihiVariant = isStihiVariant(variantKey) ? variantKey : defaultVariant

  const hero = t.stihiLanding.variants[activeVariant]

  const steps = t.stihiLanding.steps.items as Array<{
    id: string
    title: string
    description: string
  }>

  const faqItems = t.stihiLanding.faq.items as Array<{
    id: string
    question: string
    answer: string
  }>

  const pricingFeatures = useMemo(
    () => ({
      single: t.stihiLanding.pricing.single.features as string[],
      bundle: t.stihiLanding.pricing.bundle.features as string[],
    }),
    [t]
  )

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
    document.getElementById("stihi-pricing")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  return (
    <>
      <section id="about-stihi" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <HeroBackgroundImage alt={t.stihiLanding.hero.imageAlt} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/50 to-background" />
        </div>

        <div className="container mx-auto px-4 z-10 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div ref={containerRef} className="relative">
              <div className="relative inline-block">
                <div
                  className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold tracking-tight leading-tight text-pretty whitespace-pre-line"
                  aria-hidden="true"
                >
                  <span className="absolute inset-0 text-primary/20 blur-sm">{hero.title}</span>
                </div>
                <div
                  className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold tracking-tight leading-tight text-pretty whitespace-pre-line"
                  aria-hidden="true"
                >
                  <span className="absolute inset-0 text-primary/40 blur-[2px] translate-x-1 translate-y-1">
                    {hero.title}
                  </span>
                </div>
                <h1 className="parallax-layer text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold tracking-tight leading-tight text-pretty relative whitespace-pre-line">
                  <span className="bg-gradient-to-r from-primary via-foreground to-primary bg-clip-text text-transparent">
                    {hero.title}
                  </span>
                </h1>
              </div>
            </div>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto text-pretty whitespace-pre-line">
              {hero.subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                onClick={() => setOrderOpen(true)}
              >
                {t.stihiLanding.hero.cta}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="uppercase tracking-wider px-8"
                onClick={scrollToPricing}
              >
                {t.stihiLanding.hero.ctaPricing}
              </Button>
            </div>
          </div>

          <PartnerMarquee />
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">{t.stihiLanding.benefits.title}</h2>
            <p className="text-lg text-muted-foreground text-pretty">{t.stihiLanding.benefits.description}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-card border-border hover:border-primary transition-all duration-300 group">
              <div className="mb-4">
                <Music className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">
                {t.stihiLanding.benefits.items.creation.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t.stihiLanding.benefits.items.creation.description}
              </p>
            </Card>

            <Card className="p-6 bg-card border-border hover:border-primary transition-all duration-300 group">
              <div className="mb-4">
                <Globe className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">
                {t.stihiLanding.benefits.items.distribution.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t.stihiLanding.benefits.items.distribution.description}
              </p>
            </Card>

            <Card className="p-6 bg-card border-border hover:border-primary transition-all duration-300 group">
              <div className="mb-4">
                <Wallet className="h-10 w-10 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="text-xl font-bold mb-3 uppercase tracking-wide">
                {t.stihiLanding.benefits.items.royalties.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {t.stihiLanding.benefits.items.royalties.description}
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">{t.stihiLanding.steps.title}</h2>
            <p className="text-lg text-muted-foreground text-pretty">{t.stihiLanding.steps.description}</p>
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

      <section id="stihi-pricing" className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mb-16 mx-auto text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">{t.stihiLanding.pricing.title}</h2>
            <p className="text-lg text-muted-foreground text-pretty">{t.stihiLanding.pricing.description}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 bg-card border-border flex flex-col">
              <h3 className="text-2xl font-bold uppercase tracking-wide mb-2">
                {t.stihiLanding.pricing.single.title}
              </h3>
              <div className="mb-6">
                <span className="text-5xl font-bold text-primary">{t.stihiLanding.pricing.single.price}</span>
                <span className="text-2xl text-muted-foreground ml-2">
                  {t.stihiLanding.pricing.single.priceSuffix}
                </span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {pricingFeatures.single.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-muted-foreground">
                    <Check className="size-5 text-primary shrink-0 mt-0.5" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="uppercase tracking-wider w-full"
                onClick={() => setOrderOpen(true)}
              >
                {t.stihiLanding.pricing.cta}
              </Button>
            </Card>

            <Card className="p-8 bg-card border-primary relative flex flex-col">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs uppercase tracking-wider font-bold px-4 py-1 rounded-full">
                {t.stihiLanding.pricing.bundle.popular}
              </span>
              <h3 className="text-2xl font-bold uppercase tracking-wide mb-2">
                {t.stihiLanding.pricing.bundle.title}
              </h3>
              <div className="mb-1">
                <span className="text-5xl font-bold text-primary">{t.stihiLanding.pricing.bundle.price}</span>
                <span className="text-2xl text-muted-foreground ml-2">
                  {t.stihiLanding.pricing.bundle.priceSuffix}
                </span>
              </div>
              <ul className="space-y-3 mb-8 flex-1 mt-6">
                {pricingFeatures.bundle.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-muted-foreground">
                    <Check className="size-5 text-primary shrink-0 mt-0.5" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                className="uppercase tracking-wider w-full"
                onClick={() => setOrderOpen(true)}
              >
                {t.stihiLanding.pricing.cta}
              </Button>
            </Card>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-8">{t.stihiLanding.pricing.footnote}</p>
        </div>
      </section>

      <section className="py-20 bg-background border-t border-border">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">{t.stihiLanding.faq.title}</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-3xl">{t.stihiLanding.faq.description}</p>
          <AccordionPrimitive.Root type="single" collapsible className="space-y-3">
            {faqItems.map((item) => (
              <AccordionPrimitive.Item
                key={item.id}
                value={item.id}
                className="rounded-2xl border border-border bg-card/60 data-[state=open]:bg-card/80"
              >
                <AccordionPrimitive.Header>
                  <AccordionPrimitive.Trigger className="group flex w-full items-center justify-between gap-4 p-5 text-left font-semibold text-base transition-colors hover:bg-muted/30 rounded-2xl [&[data-state=open]]:rounded-b-none">
                    <span>{item.question}</span>
                    <span className="flex size-8 shrink-0 items-center justify-center text-primary">
                      <Plus className="size-4 transition-transform group-data-[state=open]:hidden" aria-hidden />
                      <Minus className="size-4 hidden group-data-[state=open]:block" aria-hidden />
                    </span>
                  </AccordionPrimitive.Trigger>
                </AccordionPrimitive.Header>
                <AccordionPrimitive.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <p className="px-5 pb-5 pt-0 text-sm text-muted-foreground whitespace-pre-line">{item.answer}</p>
                </AccordionPrimitive.Content>
              </AccordionPrimitive.Item>
            ))}
          </AccordionPrimitive.Root>
        </div>
      </section>

      <section className="py-24 bg-background border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">{t.stihiLanding.finalCta.title}</h2>
            <p className="text-lg text-muted-foreground">{t.stihiLanding.finalCta.description}</p>
            <Button
              size="lg"
              className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 px-12"
              onClick={() => setOrderOpen(true)}
            >
              {t.stihiLanding.finalCta.cta}
            </Button>
          </div>
        </div>
      </section>

      <OrderDialog open={orderOpen} onOpenChange={setOrderOpen} />
    </>
  )
}

function StihiLandingFallback() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-background">
      <div className="container mx-auto px-4 text-center">
        <div className="h-12 w-64 mx-auto bg-muted/30 rounded animate-pulse" />
      </div>
    </section>
  )
}

export function StihiLanding() {
  return (
    <Suspense fallback={<StihiLandingFallback />}>
      <StihiLandingContent />
    </Suspense>
  )
}
