"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import {
  calculateFixPackTotalRub,
  getFixPackUnitPriceRub,
  MAX_FIX_PACK_ORDER,
} from "@/lib/fix-pack-pricing"
import { TRACK_PRICE_RUB, MAX_TRACKS_TOPUP } from "@/lib/track-pricing"
import { useI18n } from "@/lib/i18n-context"

const TRACKS_MIN = 1

type PurchaseTracksDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ступенчатый прайс Fix (500/400/350); иначе flat legacy 300/400 */
  useFixPackPricing?: boolean
  unitPriceRub?: number
  title?: string
  description?: string
}

export function PurchaseTracksDialog({
  open,
  onOpenChange,
  useFixPackPricing = false,
  unitPriceRub,
  title = "Лимит треков исчерпан",
  description,
}: PurchaseTracksDialogProps) {
  const { t } = useI18n()
  const [tracksCount, setTracksCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentOfferLicense, setConsentOfferLicense] = useState(false)

  const maxTracks = useFixPackPricing ? MAX_FIX_PACK_ORDER : MAX_TRACKS_TOPUP
  const trackPriceRub = useFixPackPricing
    ? getFixPackUnitPriceRub(Math.max(1, Math.min(tracksCount, MAX_FIX_PACK_ORDER)))
    : (unitPriceRub ?? TRACK_PRICE_RUB)
  const total = useFixPackPricing
    ? calculateFixPackTotalRub(tracksCount)
    : tracksCount * trackPriceRub
  const validCount = tracksCount >= TRACKS_MIN && tracksCount <= maxTracks
  const resolvedDescription =
    description ??
    (useFixPackPricing
      ? "Оплата пакета треков: 1–5 шт. - 500 ₽/трек, 6–10 - 400 ₽, 11+ - 350 ₽."
      : `Чтобы загрузить больше треков, оплатите дополнительные. Цена за один трек - ${trackPriceRub} ₽.`)

  useEffect(() => {
    if (!open) {
      setConsentOfferLicense(false)
      setError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validCount) return
    if (!consentOfferLicense) {
      setError(t.pay.validationConsentOfferLicense)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const endpoint = useFixPackPricing
        ? "/api/cabinet/payments/fix-pack/create"
        : "/api/cabinet/payments/tracks/create"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tracksCount,
          consentOfferLicense: true,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as { confirmationUrl?: string; error?: string }
      if (!res.ok) {
        setError(data.error || "Не удалось создать платёж")
        return
      }
      if (data.confirmationUrl) {
        window.location.href = data.confirmationUrl
        return
      }
      setError("Неверный ответ сервера")
    } catch {
      setError("Ошибка сети, попробуйте позже")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{resolvedDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tracksCount">Количество треков</Label>
            <Input
              id="tracksCount"
              type="number"
              min={TRACKS_MIN}
              max={maxTracks}
              value={tracksCount}
              onChange={(e) => setTracksCount(Number(e.target.value) || 0)}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              от {TRACKS_MIN} до {maxTracks}
            </p>
          </div>
          <p className="text-sm font-medium">
            {trackPriceRub} ₽ × {tracksCount} = {total} ₽
          </p>
          <div className="flex flex-row items-start gap-3 rounded-md border border-border p-4">
            <Checkbox
              id="purchase-consent-offer-license"
              checked={consentOfferLicense}
              onCheckedChange={(checked) => setConsentOfferLicense(checked === true)}
              disabled={loading}
            />
            <label
              htmlFor="purchase-consent-offer-license"
              className="text-sm font-normal leading-snug cursor-pointer"
            >
              {t.pay.consentOfferLicenseIntro}{" "}
              <Link href="/offer" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                {t.pay.offerLink}
              </Link>{" "}
              *
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button type="submit" disabled={!validCount || loading || !consentOfferLicense}>
              {loading ? "Создание платежа…" : "Оплатить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
