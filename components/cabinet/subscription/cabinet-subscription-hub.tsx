"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowLeft, Check, Crown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { listCabinetPlanCards } from "@/lib/cabinet-subscription-catalog"
import { subscriptionNameToPlanId, type PlanId } from "@/lib/plan-pricing"
import {
  FIX_PACK_PRICE_TIER_1_RUB,
  FIX_PACK_PRICE_TIER_3_RUB,
} from "@/lib/fix-pack-pricing"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { useCabinetSubscription } from "@/components/cabinet/subscription/cabinet-subscription-provider"
import { CabinetSubscriptionAutopayPanel } from "@/components/cabinet/subscription/cabinet-subscription-autopay-panel"
import { CabinetSubscriptionExpiredBanner } from "@/components/cabinet/subscription/cabinet-subscription-expired-banner"
import { PurchaseTracksDialog } from "@/components/purchase-tracks-dialog"
import { getSubscriptionPlanPurchaseBlockReason } from "@/lib/subscription-plan-eligibility"

type UserSub = {
  subscriptionName?: string | null
  subscriptionExpiresAt?: string | null
  email?: string | null
}

async function pollOrderPaid(orderId: string, attempts = 8): Promise<"paid" | "failed" | "pending"> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(
        `/api/cabinet/payments/order-status?orderId=${encodeURIComponent(orderId)}`,
        { credentials: "include" }
      )
      const data = (await res.json().catch(() => ({}))) as { status?: string }
      if (data.status === "paid") return "paid"
      if (data.status === "failed") return "failed"
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return "pending"
}

export function CabinetSubscriptionHub() {
  const plans = useMemo(() => listCabinetPlanCards(), [])
  const { refresh: refreshSession } = useCabinetSession()
  const { openCheckout } = useCabinetSubscription()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserSub | null>(null)
  const [planTracks, setPlanTracks] = useState<
    Array<{ status?: string | null; artistName?: string | null }>
  >([])
  const [fixDialogOpen, setFixDialogOpen] = useState(false)
  const paymentHandledRef = useRef(false)

  const loadUser = useCallback(async () => {
    try {
      const [userRes, tracksRes] = await Promise.all([
        fetch("/api/cabinet/user", { credentials: "include" }),
        fetch("/api/cabinet/tracks", { credentials: "include" }),
      ])
      if (userRes.ok) {
        const data = (await userRes.json()) as { user?: UserSub }
        setUser(data.user ?? null)
      }
      if (tracksRes.ok) {
        const data = (await tracksRes.json()) as {
          tracks?: Array<{ status?: string | null; artistName?: string | null }>
        }
        setPlanTracks(data.tracks ?? [])
      }
    } catch {
      toast.error("Не удалось загрузить подписку")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUser()
  }, [loadUser])

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const paymentState = params.get("payment")
      const orderId = params.get("orderId")
      if (!paymentState || paymentHandledRef.current) return
      paymentHandledRef.current = true

      if (paymentState === "fail") {
        toast.error("Оплата подписки не завершена")
        window.history.replaceState({}, "", "/cabinet/subscription")
        return
      }

      if (paymentState === "return" && orderId) {
        void (async () => {
          toast.message("Проверяем оплату…")
          const result = await pollOrderPaid(orderId)
          if (result === "paid") {
            toast.success("Подписка оплачена и активна")
            await refreshSession({ silent: true })
            setLoading(true)
            await loadUser()
          } else if (result === "failed") {
            toast.error("Оплата не завершена")
          } else {
            toast.message(
              "Платёж ещё обрабатывается - статус обновится через минуту. Можно обновить страницу."
            )
            await refreshSession({ silent: true })
            await loadUser()
          }
          window.history.replaceState({}, "", "/cabinet/subscription")
        })()
      }
    } catch {
      // ignore
    }
  }, [loadUser, refreshSession])

  const renewPlanId = subscriptionNameToPlanId(user?.subscriptionName)
  const expiresLabel =
    user?.subscriptionExpiresAt && user.subscriptionName !== "Fix"
      ? format(new Date(user.subscriptionExpiresAt), "d MMMM yyyy", { locale: ru })
      : null

  const startCheckout = (planId: PlanId) => {
    const block = getSubscriptionPlanPurchaseBlockReason(planId, planTracks)
    if (block) {
      toast.error(block)
      return
    }
    openCheckout({ planId })
  }

  const isOnFix = user?.subscriptionName === "Fix"
  const hasOtherSubscription =
    !!user?.subscriptionName && user.subscriptionName !== "Fix"

  const onFixSelect = () => {
    if (hasOtherSubscription) {
      toast.error(
        "На аккаунте уже есть подписка. Для тарифа Fix нужен другой email или обратитесь в поддержку."
      )
      return
    }
    setFixDialogOpen(true)
  }

  return (
    <div className="w-full max-w-none space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href="/cabinet/settings?tab=profile">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            К настройкам
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Подписка и тарифы</h1>
      </div>

      <CabinetSubscriptionExpiredBanner />

      <Card className="gap-0 border-primary/25 bg-primary/[0.04] py-0">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка…
            </div>
          ) : (
            <>
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold leading-none">
                  <Crown className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">
                    {user?.subscriptionName
                      ? `Тариф ${user.subscriptionName}`
                      : "Тариф не выбран"}
                  </span>
                </p>
                {expiresLabel ? (
                  <p className="mt-1.5 pl-6 text-xs text-muted-foreground">
                    Действует до {expiresLabel}
                  </p>
                ) : user?.subscriptionName === "Fix" ? (
                  <p className="mt-1.5 pl-6 text-xs text-muted-foreground">
                    Пакет Fix - без календарной подписки
                  </p>
                ) : (
                  <p className="mt-1.5 pl-6 text-xs text-muted-foreground">
                    Выберите тариф ниже, чтобы загружать релизы
                  </p>
                )}
              </div>
              {renewPlanId ? (
                <Button type="button" size="sm" onClick={() => startCheckout(renewPlanId)}>
                  Продлить
                </Button>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <CabinetSubscriptionAutopayPanel
        subscriptionName={user?.subscriptionName}
        variant="card"
      />

      <div>
        <h2 className="text-lg font-semibold">Тарифы</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Подписка - помесячно или за год со скидкой. Fix - пакет треков без календарной подписки.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {plans.map((plan) => {
          const isCurrent =
            !!user?.subscriptionName &&
            user.subscriptionName.toLowerCase() === plan.title.toLowerCase()
          const planBlock = getSubscriptionPlanPurchaseBlockReason(plan.id, planTracks)
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col transition-all duration-300",
                "motion-safe:hover:-translate-y-1 hover:border-primary/45",
                "hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
                plan.popular && "border-primary/50",
                isCurrent && "ring-1 ring-primary/40",
                planBlock && "opacity-80"
              )}
            >
              {plan.popular ? (
                <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                  Популярный
                </span>
              ) : null}
              <CardHeader className="pb-2 pt-5">
                <CardTitle className="text-lg">{plan.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                <div>
                  <p className="text-3xl font-semibold tabular-nums">
                    {plan.priceMonth.toLocaleString("ru-RU")} ₽
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/мес</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    от {plan.priceYearMonthly.toLocaleString("ru-RU")} ₽/мес при оплате за год
                  </p>
                </div>
                <p className="flex gap-2 text-sm text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{plan.limitLabel}</span>
                </p>
                {planBlock ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">{planBlock}</p>
                ) : null}
                <div className="mt-auto pt-2">
                  <Button
                    type="button"
                    className="w-full"
                    variant={isCurrent ? "default" : "outline"}
                    disabled={Boolean(planBlock)}
                    title={planBlock ?? undefined}
                    onClick={() => startCheckout(plan.id)}
                  >
                    {planBlock ? "Недоступно" : isCurrent ? "Продлить" : "Выбрать"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        <Card
          className={cn(
            "relative flex flex-col transition-all duration-300",
            "motion-safe:hover:-translate-y-1 hover:border-primary/45",
            "hover:shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
            isOnFix && "ring-1 ring-primary/40"
          )}
        >
          <CardHeader className="pb-2 pt-5">
            <CardTitle className="text-lg">Fix</CardTitle>
            <p className="text-sm text-muted-foreground">Без ежемесячной подписки</p>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <div>
              <p className="text-3xl font-semibold tabular-nums">
                от {FIX_PACK_PRICE_TIER_3_RUB.toLocaleString("ru-RU")} ₽
                <span className="ml-1 text-sm font-normal text-muted-foreground">/трек</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {FIX_PACK_PRICE_TIER_1_RUB} ₽ за трек при заказе 1-5 шт., дальше дешевле
              </p>
            </div>
            <p className="flex gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>Платите только за треки, без срока подписки</span>
            </p>
            <div className="mt-auto pt-2">
              <Button
                type="button"
                className="w-full"
                variant={isOnFix ? "default" : "outline"}
                disabled={hasOtherSubscription}
                title={
                  hasOtherSubscription
                    ? "Недоступно при активной подписке Start/Medium/Pro/Label"
                    : undefined
                }
                onClick={onFixSelect}
              >
                {isOnFix ? "Докупить треки" : hasOtherSubscription ? "Недоступно" : "Выбрать"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <PurchaseTracksDialog
        open={fixDialogOpen}
        onOpenChange={setFixDialogOpen}
        useFixPackPricing
        title="Пакет Fix"
        description="Оплата пакета треков: 1-5 шт. - 500 ₽/трек, 6-10 - 400 ₽, 11+ - 350 ₽."
      />
    </div>
  )
}
