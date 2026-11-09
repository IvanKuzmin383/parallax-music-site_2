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
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { trackGoal } from "@/lib/analytics"
import { toast } from "sonner"

const TRACKS_MIN = 1

type PurchaseTracksDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Ступенчатый прайс Fix (500/400/350); иначе flat legacy 300/400 */
  useFixPackPricing?: boolean
  unitPriceRub?: number
  title?: string
  description?: string
  /** Вызывается после подтверждённой оплаты с баланса (оплата картой подтверждается на возврате из банка). */
  onPaid?: () => void
  /** Предзаполненное количество треков (например, с публичной страницы тарифов). */
  initialTracks?: number
}

export function PurchaseTracksDialog({
  open,
  onOpenChange,
  useFixPackPricing = false,
  unitPriceRub,
  title = "Лимит треков исчерпан",
  description,
  onPaid,
  initialTracks,
}: PurchaseTracksDialogProps) {
  const { t } = useI18n()
  const { user, refresh: refreshSession } = useCabinetSession()
  const walletBalance = user?.walletBalance ?? 0
  /** Fix: баланс или карта. Дозаказ треков по старому тарифу: только баланс. */
  const [chosenMethod, setChosenMethod] = useState<"wallet" | "card" | null>(null)
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
  const walletEnough = walletBalance >= total
  const payMethod: "wallet" | "card" = !useFixPackPricing
    ? "wallet"
    : chosenMethod === "wallet" && walletEnough
      ? "wallet"
      : chosenMethod === "card"
        ? "card"
        : walletEnough
          ? "wallet"
          : "card"
  const resolvedDescription =
    description ??
    (useFixPackPricing
      ? "Оплата пакета треков: 1-5 шт. - 500 ₽/трек, 6-10 - 400 ₽, 11+ - 350 ₽."
      : `Чтобы загрузить больше треков, оплатите дополнительные. Цена за один трек - ${trackPriceRub} ₽.`)

  useEffect(() => {
    if (open && initialTracks && initialTracks >= TRACKS_MIN && initialTracks <= maxTracks) {
      setTracksCount(initialTracks)
    }
  }, [open, initialTracks, maxTracks])

  useEffect(() => {
    if (!open) {
      setConsentOfferLicense(false)
      setError(null)
      setChosenMethod(null)
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
          ...(useFixPackPricing ? { payMethod } : {}),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        confirmationUrl?: string
        paid?: boolean
        error?: string
      }
      if (!res.ok) {
        setError(data.error || "Не удалось создать платёж")
        return
      }
      if (data.confirmationUrl) {
        trackGoal("plan_checkout_start", { order_type: useFixPackPricing ? "fix_pack" : "tracks", method: "card" })
        window.location.href = data.confirmationUrl
        return
      }
      if (data.paid) {
        // Оплата с баланса: сервер уже списал деньги и начислил треки.
        toast.success(`Оплачено с баланса: ${total.toLocaleString("ru-RU")} ₽. Треки добавлены.`)
        trackGoal("purchase_success", { order_type: useFixPackPricing ? "fix_pack" : "tracks", method: "wallet" })
        await refreshSession({ silent: true })
        onPaid?.()
        onOpenChange(false)
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
          {useFixPackPricing ? (
            <fieldset className="space-y-2" disabled={loading}>
              <legend className="text-sm font-medium">Способ оплаты</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer flex-col gap-0.5 rounded-md border p-3 text-sm ${
                    payMethod === "card" ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="fix-pay-method"
                      checked={payMethod === "card"}
                      onChange={() => setChosenMethod("card")}
                    />
                    Банковская карта
                  </span>
                  <span className="text-xs text-muted-foreground">Оплата на странице ТБанка</span>
                </label>
                <label
                  className={`flex flex-col gap-0.5 rounded-md border p-3 text-sm ${
                    walletEnough ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                  } ${payMethod === "wallet" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <span className="flex items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="fix-pay-method"
                      checked={payMethod === "wallet"}
                      disabled={!walletEnough}
                      onChange={() => setChosenMethod("wallet")}
                    />
                    С баланса кабинета
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {walletEnough
                      ? `Доступно ${walletBalance.toLocaleString("ru-RU")} ₽`
                      : `Не хватает: на балансе ${walletBalance.toLocaleString("ru-RU")} ₽`}
                  </span>
                </label>
              </div>
            </fieldset>
          ) : null}
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
              {loading
                ? "Создание платежа…"
                : payMethod === "card"
                  ? `Оплатить картой ${total.toLocaleString("ru-RU")} ₽`
                  : `Оплатить с баланса ${total.toLocaleString("ru-RU")} ₽`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
