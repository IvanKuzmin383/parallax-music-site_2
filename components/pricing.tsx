"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n-context"
import { Percent, CreditCard, Disc3 } from "lucide-react"

type Period = "month" | "year"

export function Pricing() {
  const { t } = useI18n()
  const router = useRouter()
  const [period, setPeriod] = useState<Period>("year")

  const handleStartClick = (planId: string) => {
    router.push(`/pay/${planId}?period=${period}`)
  }

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

  return (
    <section id="pricing" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto mb-16 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">{t.pricing.title}</span>{" "}
            <span className="text-primary">{t.pricing.titleHighlight}</span>
          </h2>
          <p className="text-lg text-muted-foreground text-pretty">{t.pricing.description}</p>
        </div>

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
                  <div className="flex items-baseline gap-2 mb-6">
                    {showDiscount && (
                      <span className="text-sm font-medium text-green-600 dark:text-green-500">
                        {plan.discount ?? t.pricing.discount}
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

                  <div className="space-y-3 mb-6 flex-1">
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50 border border-border">
                      <Disc3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold text-sm">{plan.releasesLimit}</h3>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50 border border-border">
                      <Percent className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold mb-1 text-sm">{t.pricing.royaltyTitle}</h3>
                        <p className="text-muted-foreground text-xs">{t.pricing.royaltyDescription}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-2 rounded-lg bg-background/50 border border-border">
                      <CreditCard className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <h3 className="font-semibold mb-1 text-sm">{t.pricing.paymentTitle}</h3>
                        <p className="text-muted-foreground text-xs">{t.pricing.paymentDescription}</p>
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
      </div>
    </section>
  )
}
