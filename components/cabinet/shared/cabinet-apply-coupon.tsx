"use client"

import { useCallback, useEffect, useState } from "react"
import { Gift, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type ApplicableCouponPreview = {
  id: string
  code: string
  title: string
  discountRub: number
  finalAmountRub: number
  expiresAt: string | null
}

type Props = {
  orderType: string
  amountRub: number
  applied: boolean
  onAppliedChange: (applied: boolean, preview: ApplicableCouponPreview | null) => void
  className?: string
  /** Компактный вид для диалогов оплаты */
  compact?: boolean
}

export function CabinetApplyCouponControl({
  orderType,
  amountRub,
  applied,
  onAppliedChange,
  className,
  compact,
}: Props) {
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState<ApplicableCouponPreview | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!orderType || !(amountRub > 0)) {
        if (!cancelled) {
          setPreview(null)
          setLoading(false)
        }
        return
      }
      setLoading(true)
      try {
        const params = new URLSearchParams({
          orderType,
          amount: String(amountRub),
        })
        const res = await fetch(`/api/cabinet/coupons/applicable?${params}`, {
          credentials: "include",
        })
        if (!res.ok) {
          if (!cancelled) setPreview(null)
          return
        }
        const data = (await res.json()) as {
          available?: boolean
          coupon?: ApplicableCouponPreview | null
        }
        const next = data.available && data.coupon ? data.coupon : null
        if (!cancelled) setPreview(next)
      } catch {
        if (!cancelled) setPreview(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [orderType, amountRub])

  useEffect(() => {
    if (!preview) {
      if (applied) onAppliedChange(false, null)
      return
    }
    if (applied) onAppliedChange(true, preview)
  }, [preview, applied, onAppliedChange])

  if (loading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          className
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Проверяем купоны…
      </div>
    )
  }

  if (!preview) return null

  if (applied) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2",
          className
        )}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-emerald-400">
            Купон применён: −{preview.discountRub.toLocaleString("ru-RU")} ₽
          </p>
          {!compact ? (
            <p className="text-xs text-muted-foreground truncate">{preview.title}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            К оплате: {preview.finalAmountRub.toLocaleString("ru-RU")} ₽
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={() => onAppliedChange(false, preview)}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Снять
        </Button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/10 px-3 py-2",
        className
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">Есть купон: −{preview.discountRub.toLocaleString("ru-RU")} ₽</p>
        {!compact ? (
          <p className="text-xs text-muted-foreground truncate">{preview.title}</p>
        ) : null}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 border-primary/40 bg-background/40"
        onClick={() => onAppliedChange(true, preview)}
      >
        <Gift className="h-3.5 w-3.5 mr-1.5" />
        Применить купон
      </Button>
    </div>
  )
}

/** Поля для body оплаты. */
export function couponPaymentPayload(applied: boolean): { applyCoupon?: true } {
  return applied ? { applyCoupon: true } : {}
}
