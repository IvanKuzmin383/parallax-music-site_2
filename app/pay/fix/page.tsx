"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useI18n } from "@/lib/i18n-context"
import {
  calculateFixPackTotalRub,
  getFixPackUnitPriceRub,
  isValidFixPackTracksCount,
  MAX_FIX_PACK_ORDER,
} from "@/lib/fix-pack-pricing"
import { Disc3, ChevronLeft } from "lucide-react"
import { toast } from "sonner"

function parseTracksFromSearchParams(searchParams: URLSearchParams): number {
  const raw = searchParams.get("tracks")
  const n = raw ? parseInt(raw, 10) : NaN
  if (isValidFixPackTracksCount(n)) return n
  return 5
}

function PayFixPageContent() {
  const { t } = useI18n()
  const fix = t.payFix
  const searchParams = useSearchParams()

  const [tracksCount, setTracksCount] = useState(() => parseTracksFromSearchParams(searchParams))

  useEffect(() => {
    setTracksCount(parseTracksFromSearchParams(searchParams))
  }, [searchParams])
  const [email, setEmail] = useState("")
  const [telegram, setTelegram] = useState("")
  const [agreeOffer, setAgreeOffer] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePersonalData, setAgreePersonalData] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [loading, setLoading] = useState(false)

  const unitPrice = useMemo(
    () => (tracksCount >= 1 && tracksCount <= MAX_FIX_PACK_ORDER ? getFixPackUnitPriceRub(tracksCount) : 0),
    [tracksCount]
  )
  const totalAmount = useMemo(
    () =>
      tracksCount >= 1 && tracksCount <= MAX_FIX_PACK_ORDER ? calculateFixPackTotalRub(tracksCount) : 0,
    [tracksCount]
  )

  const validCount =
    Number.isInteger(tracksCount) && tracksCount >= 1 && tracksCount <= MAX_FIX_PACK_ORDER

  const canSubmit =
    validCount &&
    !!email.trim() &&
    agreeOffer &&
    agreeTerms &&
    agreePersonalData &&
    agreePrivacy &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!canSubmit) {
      toast.error(t.pay.validationAgree)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/payments/fix/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracksCount,
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
      console.error("pay/fix submit error", err)
      toast.error(t.pay.errorCreate)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-xl mx-auto space-y-6">
          <Link
            href="/?billing=onetime#pricing"
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80"
          >
            <ChevronLeft className="h-4 w-4" />
            {fix.backToPricing}
          </Link>

          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">{fix.title}</h1>
            <p className="text-muted-foreground">{fix.description}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{fix.planInfo}</CardTitle>
              <CardDescription>{fix.planSubtitle}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
                <Disc3 className="h-5 w-5 text-primary mt-0.5" />
                <span>{fix.tier1}</span>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
                <Disc3 className="h-5 w-5 text-primary mt-0.5" />
                <span>{fix.tier2}</span>
              </div>
              <div className="flex items-start gap-3 rounded-lg border bg-muted/40 p-3">
                <Disc3 className="h-5 w-5 text-primary mt-0.5" />
                <span>{fix.tier3}</span>
              </div>
              <p className="text-muted-foreground text-xs pt-1">{fix.royaltyNote}</p>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t.pay.yourData}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label htmlFor="fix-pay-email" className="block text-sm font-medium mb-1">
                    {t.pay.email} *
                  </label>
                  <Input
                    id="fix-pay-email"
                    type="email"
                    placeholder={t.pay.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="fix-pay-telegram" className="block text-sm font-medium mb-1">
                    {t.pay.telegram}
                  </label>
                  <Input
                    id="fix-pay-telegram"
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
                <CardTitle>{fix.tracksCountLabel}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  type="number"
                  min={1}
                  max={MAX_FIX_PACK_ORDER}
                  value={tracksCount}
                  onChange={(e) => setTracksCount(Number(e.target.value) || 0)}
                  disabled={loading}
                />
                <p className="text-sm text-muted-foreground">
                  {fix.tracksCountHint.replace("{max}", String(MAX_FIX_PACK_ORDER))}
                </p>
                <p className="text-sm text-muted-foreground">
                  {unitPrice} ₽ × {tracksCount} ={" "}
                  <span className="font-semibold text-foreground">{totalAmount} ₽</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="fix-agree-offer"
                    checked={agreeOffer}
                    onCheckedChange={(checked) => setAgreeOffer(Boolean(checked))}
                    disabled={loading}
                  />
                  <label htmlFor="fix-agree-offer" className="text-sm leading-none cursor-pointer">
                    {t.pay.agreeOffer}{" "}
                    <Link href="/offer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {t.pay.offerLink}
                    </Link>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="fix-agree-terms"
                    checked={agreeTerms}
                    onCheckedChange={(checked) => setAgreeTerms(Boolean(checked))}
                    disabled={loading}
                  />
                  <label htmlFor="fix-agree-terms" className="text-sm leading-none cursor-pointer">
                    {t.pay.agreeTerms}{" "}
                    <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {t.pay.termsLink}
                    </Link>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="fix-agree-personal-data"
                    checked={agreePersonalData}
                    onCheckedChange={(checked) => setAgreePersonalData(Boolean(checked))}
                    disabled={loading}
                  />
                  <label htmlFor="fix-agree-personal-data" className="text-sm leading-snug cursor-pointer">
                    {t.pay.agreePersonalData}{" "}
                    <Link
                      href="/personal-data-consent"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {t.pay.personalDataConsentLink}
                    </Link>
                  </label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="fix-agree-privacy"
                    checked={agreePrivacy}
                    onCheckedChange={(checked) => setAgreePrivacy(Boolean(checked))}
                    disabled={loading}
                  />
                  <label htmlFor="fix-agree-privacy" className="text-sm leading-snug cursor-pointer">
                    {t.pay.agreePrivacy}{" "}
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
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
              <Button type="submit" size="lg" className="w-full" disabled={!canSubmit || loading}>
                {loading ? t.pay.loading : t.pay.payButton}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}

export default function PayFixPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-background pt-20 flex items-center justify-center">
          <p className="text-muted-foreground">Загрузка...</p>
        </main>
      }
    >
      <PayFixPageContent />
    </Suspense>
  )
}
