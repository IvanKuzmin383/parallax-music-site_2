"use client"

import { useState, useMemo } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useI18n } from "@/lib/i18n-context"
import { formatMonthsCountLabel, formatPayPeriodOptionLabel } from "@/lib/pay-period-labels"
import { isPlanId } from "@/lib/plan-pricing"
import { Disc3, ChevronLeft } from "lucide-react"
import { toast } from "sonner"

type Period = "month" | "year"

export default function PayPage() {
  const params = useParams<{ planId: string }>()
  const searchParams = useSearchParams()
  const { t, locale } = useI18n()

  const initialPeriod = (searchParams.get("period") as Period) === "month" ? "month" : "year"
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [periodsCount, setPeriodsCount] = useState(1)
  const [email, setEmail] = useState("")
  const [telegram, setTelegram] = useState("")
  const [agreeOffer, setAgreeOffer] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePersonalData, setAgreePersonalData] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [loading, setLoading] = useState(false)

  const plans = t.pricing.plans as Array<{
    id: string
    title: string
    subtitle: string
    releasesLimit: string
    priceMonth: number
    priceYear: number
  }>

  const plan = useMemo(() => {
    const id = params.planId
    if (!id || !isPlanId(id)) return null
    return plans.find((p) => p.id === id) ?? null
  }, [params.planId, plans])

  const maxPeriods = period === "month" ? 12 : 3
  const pricePerMonth =
    plan && (period === "month" ? plan.priceMonth : plan.priceYear)
  const totalMonths = periodsCount * (period === "month" ? 1 : 12)
  const totalAmount = pricePerMonth ? pricePerMonth * totalMonths : 0

  const canSubmit =
    !!plan &&
    !!email.trim() &&
    agreeOffer &&
    agreeTerms &&
    agreePersonalData &&
    agreePrivacy &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!plan || loading) return
    if (!canSubmit) {
      toast.error(t.pay.validationAgree)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          period,
          periodsCount,
          email: email.trim(),
          telegram: telegram.trim(),
          consentPublicOffer: true,
          consentTermsOfUse: true,
          consentPersonalData: true,
          consentPrivacyPolicy: true,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (res.ok && data.confirmationUrl) {
        window.location.href = data.confirmationUrl
        return
      }
      toast.error(data.error || t.pay.errorCreate)
    } catch (err) {
      console.error("pay/submit error", err)
      toast.error(t.pay.errorCreate)
    } finally {
      setLoading(false)
    }
  }

  if (!plan) {
    return (
      <main className="min-h-screen bg-background pt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-xl mx-auto text-center space-y-4">
            <h1 className="text-2xl font-bold">{t.pay.planNotFound}</h1>
            <Link href="/#pricing">
              <Button variant="outline">{t.pay.backToPricing}</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto space-y-6">
          <Link
            href="/#pricing"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
          >
            <ChevronLeft className="h-4 w-4" />
            {t.pay.backToPricing}
          </Link>

          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">{t.pay.title}</h1>
            <p className="text-muted-foreground">{t.pay.description}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t.pay.planInfo}</CardTitle>
              <CardDescription>
                {plan.title} — {plan.subtitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
                <Disc3 className="h-5 w-5 text-primary mt-0.5" />
                <span className="text-sm font-medium">{plan.releasesLimit}</span>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.pay.yourData}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="pay-email" className="block text-sm font-medium mb-1">
                    {t.pay.email} *
                  </label>
                  <Input
                    id="pay-email"
                    type="email"
                    placeholder={t.pay.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="pay-telegram" className="block text-sm font-medium mb-1">
                    {t.pay.telegram}
                  </label>
                  <Input
                    id="pay-telegram"
                    type="text"
                    placeholder={t.pay.telegramPlaceholder}
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t.pay.period}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Tabs
                  value={period}
                  onValueChange={(v) => {
                    const nextPeriod = v as Period
                    setPeriod(nextPeriod)
                    if (nextPeriod === "year") {
                      setPeriodsCount(1)
                    }
                  }}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="month">{t.pay.periodMonth}</TabsTrigger>
                    <TabsTrigger value="year">{t.pay.periodYear}</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t.pay.periodsCount}
                  </label>
                  <select
                    className="w-full h-9 rounded-md border border-input bg-white text-black dark:bg-background dark:text-foreground px-3 text-sm"
                    value={periodsCount}
                    onChange={(e) => setPeriodsCount(parseInt(e.target.value, 10))}
                    disabled={loading}
                  >
                    {Array.from({ length: maxPeriods }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {formatPayPeriodOptionLabel(n, period, locale)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pricePerMonth ?? 0} ₽/мес × {formatMonthsCountLabel(totalMonths, locale)} ={" "}
                  <span className="font-semibold text-foreground">{totalAmount} ₽</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree-offer"
                    checked={agreeOffer}
                    onCheckedChange={(checked) => setAgreeOffer(Boolean(checked))}
                    disabled={loading}
                  />
                  <label
                    htmlFor="agree-offer"
                    className="text-sm leading-none cursor-pointer"
                  >
                    {t.pay.agreeOffer}{" "}
                    <Link href="/offer" className="text-primary hover:underline">
                      {t.pay.offerLink}
                    </Link>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree-terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(Boolean(checked))}
                    disabled={loading}
                  />
                  <label
                    htmlFor="agree-terms"
                    className="text-sm leading-none cursor-pointer"
                  >
                    {t.pay.agreeTerms}{" "}
                    <Link href="/terms" className="text-primary hover:underline">
                      {t.pay.termsLink}
                    </Link>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree-personal-data"
                    checked={agreePersonalData}
                    onCheckedChange={(checked) => setAgreePersonalData(Boolean(checked))}
                    disabled={loading}
                  />
                  <label
                    htmlFor="agree-personal-data"
                    className="text-sm leading-snug cursor-pointer"
                  >
                    {t.pay.agreePersonalData}{" "}
                    <Link href="/personal-data-consent" className="text-primary hover:underline">
                      {t.pay.personalDataConsentLink}
                    </Link>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree-privacy"
                    checked={agreePrivacy}
                    onCheckedChange={(checked) => setAgreePrivacy(Boolean(checked))}
                    disabled={loading}
                  />
                  <label htmlFor="agree-privacy" className="text-sm leading-snug cursor-pointer">
                    {t.pay.agreePrivacy}{" "}
                    <Link href="/privacy" className="text-primary hover:underline">
                      {t.pay.privacyPolicyLink}
                    </Link>
                  </label>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <span className="font-medium">{t.pay.total}</span>
                <span className="text-2xl font-bold">{totalAmount} ₽</span>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={!canSubmit || loading}
              >
                {loading ? t.pay.loading : t.pay.payButton}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

