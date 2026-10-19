"use client"

import Link from "next/link"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { isCabinetSubscriptionExpiredForNavigation } from "@/lib/cabinet-subscription-gate"
import { subscriptionNameToPlanId } from "@/lib/plan-pricing"
import { useCabinetSubscription } from "@/components/cabinet/subscription/cabinet-subscription-provider"

/** Баннер на главной / в кабинете, если календарная подписка истекла. */
export function CabinetSubscriptionExpiredBanner() {
  const { user, loading } = useCabinetSession()
  const { openPaywall, openCheckout } = useCabinetSubscription()

  if (loading || !user) return null
  if (!isCabinetSubscriptionExpiredForNavigation(user)) return null

  const renewPlanId = subscriptionNameToPlanId(user.subscriptionName)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Подписка {user.subscriptionName || ""} истекла
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Загрузка новых релизов недоступна, пока не продлите тариф.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:shrink-0">
        {renewPlanId ? (
          <Button type="button" size="sm" onClick={() => openCheckout({ planId: renewPlanId })}>
            Продлить
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() =>
              openPaywall("Для загрузки треков необходима активная подписка.")
            }
          >
            Выбрать тариф
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <Link href="/cabinet/subscription">Тарифы</Link>
        </Button>
      </div>
    </div>
  )
}
