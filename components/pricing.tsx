"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n-context"
import { calculateFixPackTotalRub } from "@/lib/fix-pack-pricing"
import { cabinetAuthHref } from "@/components/cabinet/shared/service-landing-mode"
import { trackGoal } from "@/lib/analytics"
import { Check, Disc3 } from "lucide-react"

type Period = "month" | "year"
type BillingMode = "onetime" | "subscription"

type FixTierCard = {
  id: string
  title: string
  subtitle: string
  pricePerTrack: number
  defaultTracks: number
  popular?: boolean
  discount?: string | null
}

function formatPriceFromOrder(template: string, amount: number, locale: string): string {
  const formatted = amount.toLocaleString(locale === "en" ? "en-US" : "ru-RU")
  return template.replace("{amount}", formatted)
}

function PricingContent({ asPageHeader }: { asPageHeader: boolean }) {
  const { t, locale } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [billingMode, setBillingMode] = useState<BillingMode>("subscription")

  useEffect(() => {
    if (searchParams.get("billing") === "onetime") {
      setBillingMode("onetime")
    }
  }, [searchParams])
  const [period, setPeriod] = useState<Period>("year")

  // Покупка тарифа - внутри кабинета: гость сначала бесплатно регистрируется, затем открывается оплата выбранного тарифа.
  const handleStartClick = (planId: string) => {
    trackGoal("cta_pricing_click", { location: "pricing", plan: planId, period })
    router.push(cabinetAuthHref(`/cabinet/subscription?buy=${planId}&period=${period}`, true))
  }

  const fixTiers = t.pricing.fixTiers as FixTierCard[]

  const plans = t.pricing.plans as Array<{
    id: string
    title: string
    subtitle: string
    popular?: boolean
    releasesLimit: string
    priceMonth: number
    priceYear: number
    discount?: string
  }>
  const HeadingTag = asPageHeader ? "h1" : "h2"

  return (
    <section id="pricing" className={asPageHeader ? "pb-20 pt-28 md:pt-36" : "py-24"}>
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto mb-16 text-center">
          <HeadingTag className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">{t.pricing.title}</span>{" "}
            <span className="text-primary">{t.pricing.titleHighlight}</span>
          </HeadingTag>
          <p className="text-lg text-muted-foreground text-pretty whitespace-pre-line">{t.pricing.description}</p>
        </div>

        <div className="flex justify-center mb-10">
          <Tabs
            value={billingMode}
            onValueChange={(v) => setBillingMode(v as BillingMode)}
            className="w-full max-w-md"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="onetime">{t.pricing.modeOnetime}</TabsTrigger>
              <TabsTrigger value="subscription">{t.pricing.modeSubscription}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {billingMode === "onetime" ? (
          <>
            <p className="text-center text-muted-foreground mb-8 max-w-2xl mx-auto">
              {t.pricing.onetimeIntro}
            </p>
            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {fixTiers.map((tier) => {
                const priceFrom = calculateFixPackTotalRub(tier.defaultTracks)
                return (
                  <Card
                    key={tier.id}
                    className={`py-8 px-6 flex flex-col gap-0 transition-all duration-300 ${
                      tier.popular
                        ? "border-primary/50 bg-gradient-to-b from-primary/5 to-transparent dark:from-primary/10 dark:to-transparent"
                        : "bg-card border-border hover:border-primary"
                    }`}
                  >
                    <CardHeader className="text-left pb-4 px-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-2xl font-bold">{tier.title}</CardTitle>
                        {tier.popular && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-primary/20 text-primary">
                            {t.pricing.popularBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{tier.subtitle}</p>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col px-0">
                      <div className="flex items-baseline gap-2 mb-6 flex-wrap">
                        {tier.discount && (
                          <span className="text-sm font-medium text-green-600 dark:text-green-500">
                            {tier.discount}
                          </span>
                        )}
                        <span className="text-3xl font-bold">{tier.pricePerTrack}</span>
                        <span className="text-muted-foreground text-sm">{t.pricing.perTrack}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-6">
                        {formatPriceFromOrder(t.pricing.priceFromOrder as string, priceFrom, locale)}
                      </p>

                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50 border border-border">
                          <Disc3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h3 className="font-semibold text-sm">Fix</h3>
                            <p className="text-muted-foreground text-xs">{t.pricing.fixPlanHint}</p>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        variant={tier.popular ? "default" : "outline"}
                        className="w-full"
                        asChild
                      >
                        <Link
                          href={cabinetAuthHref(`/cabinet/subscription?buy=fix&tracks=${tier.defaultTracks}`, true)}
                          onClick={() => trackGoal("cta_pricing_click", { location: "pricing", plan: "fix" })}
                        >
                          {t.pricing.fixCtaButton}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-10">
              <Tabs
                value={period}
                onValueChange={(v) => setPeriod(v as Period)}
                className="w-full max-w-xs"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="month">{t.pricing.periodMonth}</TabsTrigger>
                  <TabsTrigger value="year">{t.pricing.periodYear}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {plans.map((plan) => {
                const currentPrice = period === "month" ? plan.priceMonth : plan.priceYear
                const originalPrice = period === "year" ? plan.priceMonth : undefined
                const showDiscount = period === "year"
                // Скидка считается из цен, а не хранится строкой: подпись всегда совпадает с суммами.
                const discountPercent = Math.max(0, Math.round((1 - plan.priceYear / plan.priceMonth) * 100))
                const yearTotal = plan.priceYear * 12

                return (
                  <Card
                    key={plan.id}
                    className={`py-8 px-6 flex flex-col gap-0 transition-all duration-300 ${
                      plan.popular
                        ? "border-primary/50 bg-gradient-to-b from-primary/5 to-transparent dark:from-primary/10 dark:to-transparent relative overflow-hidden"
                        : "bg-card border-border hover:border-primary"
                    }`}
                  >
                    <CardHeader className="text-left pb-4 px-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-2xl font-bold">{plan.title}</CardTitle>
                        {plan.popular && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-primary/20 text-primary">
                            {t.pricing.popularBadge}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{plan.subtitle}</p>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col px-0">
                      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        {showDiscount && discountPercent > 0 && (
                          <span className="text-sm font-medium text-green-600 dark:text-green-500">
                            -{discountPercent}%
                          </span>
                        )}
                        {originalPrice && showDiscount && (
                          <span className="text-muted-foreground line-through text-lg">
                            {originalPrice}
                          </span>
                        )}
                        <span className="text-3xl font-bold">{currentPrice}</span>
                        <span className="text-muted-foreground text-sm">{t.pricing.perMonth}</span>
                      </div>
                      <p className="mb-6 min-h-[1.25rem] text-xs text-muted-foreground">
                        {period === "year"
                          ? formatPriceFromOrder(t.pricing.yearTotal as string, yearTotal, locale)
                          : t.pricing.monthNote}
                      </p>

                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50 border border-border">
                          <Disc3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <div>
                            <h3 className="font-semibold text-sm">{plan.releasesLimit}</h3>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        variant={plan.popular ? "default" : "outline"}
                        className="w-full"
                        onClick={() => handleStartClick(plan.id)}
                      >
                        {t.pricing.ctaButton}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-muted-foreground">
              {t.pricing.activeTrackNote}
            </p>

            <div className="mx-auto mt-10 flex max-w-3xl flex-col items-start justify-between gap-4 rounded-2xl border border-border bg-card/60 p-5 sm:flex-row sm:items-center">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">{t.pricing.fixStrip.title}</h3>
                <p className="text-sm text-muted-foreground">{t.pricing.fixStrip.description}</p>
              </div>
              <Button type="button" variant="outline" className="shrink-0" onClick={() => setBillingMode("onetime")}>
                {t.pricing.fixStrip.cta}
              </Button>
            </div>
          </>
        )}

        <div className="mx-auto mt-12 max-w-4xl">
          <h3 className="mb-4 text-center text-lg font-semibold">{t.pricing.sharedTitle}</h3>
          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            {(t.pricing.sharedItems as string[]).map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-lg border border-border bg-background/50 p-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export function Pricing({ asPageHeader = false }: { asPageHeader?: boolean }) {
  return (
    <Suspense fallback={<section id="pricing" className="py-20" aria-hidden />}>
      <PricingContent asPageHeader={asPageHeader} />
    </Suspense>
  )
}
