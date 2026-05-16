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
import { TRACK_PRICE_RUB, MAX_TRACKS_TOPUP } from "@/lib/track-pricing"
import { useI18n } from "@/lib/i18n-context"

const TRACKS_MIN = 1

type PurchaseTracksDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  unitPriceRub?: number
  title?: string
  description?: string
}

export function PurchaseTracksDialog({
  open,
  onOpenChange,
  unitPriceRub,
  title = "Лимит треков исчерпан",
  description,
}: PurchaseTracksDialogProps) {
  const { t } = useI18n()
  const [tracksCount, setTracksCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [consentOfferLicense, setConsentOfferLicense] = useState(false)

  const trackPriceRub = unitPriceRub ?? TRACK_PRICE_RUB
  const total = tracksCount * trackPriceRub
  const validCount = tracksCount >= TRACKS_MIN && tracksCount <= MAX_TRACKS_TOPUP
  const resolvedDescription =
    description ??
    `Чтобы загрузить больше треков, оплатите дополнительные. Цена за один трек — ${trackPriceRub} ₽.`

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
      const res = await fetch("/api/cabinet/payments/tracks/create", {
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
              max={MAX_TRACKS_TOPUP}
              value={tracksCount}
              onChange={(e) => setTracksCount(Number(e.target.value) || 0)}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground">
              от {TRACKS_MIN} до {MAX_TRACKS_TOPUP}
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
