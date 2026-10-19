"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowLeft, Check, Crown, Loader2, Plus, Users } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { listCabinetPlanCards } from "@/lib/cabinet-subscription-catalog"
import { subscriptionNameToPlanId, type PlanId } from "@/lib/plan-pricing"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { useCabinetSubscription } from "@/components/cabinet/subscription/cabinet-subscription-provider"
import { CabinetSubscriptionAutopayPanel } from "@/components/cabinet/subscription/cabinet-subscription-autopay-panel"
import { CabinetSubscriptionExpiredBanner } from "@/components/cabinet/subscription/cabinet-subscription-expired-banner"
import { isArtistSlotActive } from "@/lib/subscription-track-limits"

type ArtistSlotView = {
  id: string
  artistName?: string | null
  subscriptionName: string
  subscriptionExpiresAt?: string | null
}

type UserSub = {
  subscriptionName?: string | null
  subscriptionExpiresAt?: string | null
  email?: string | null
  artistSubscriptions?: ArtistSlotView[]
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
  const paymentHandledRef = useRef(false)

  const loadUser = useCallback(async () => {
    try {
      const userRes = await fetch("/api/cabinet/user", { credentials: "include" })
      if (userRes.ok) {
        const data = (await userRes.json()) as { user?: UserSub }
        setUser(data.user ?? null)
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

  const slots = user?.artistSubscriptions ?? []
  const activeSlots = slots.filter((s) => isArtistSlotActive(s.subscriptionExpiresAt))
  const hasLabelSlot = activeSlots.some((s) => s.subscriptionName === "Label")
  const canBuyExtraSlot =
    !!renewPlanId && renewPlanId !== "label" && activeSlots.length > 0 && !hasLabelSlot

  const startCheckout = (planId: PlanId, purchaseIntent?: "extra_slot") => {
    openCheckout({ planId, purchaseIntent })
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
        <p className="mt-1 text-sm text-muted-foreground">
          Продлевайте или меняйте тариф в любой момент. Согласия - в кабинете, оплата на странице банка.
        </p>
      </div>

      <CabinetSubscriptionExpiredBanner />

      <Card className="border-primary/25 bg-primary/[0.04]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-primary" />
            Текущий статус
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Загрузка…
            </div>
          ) : (
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold">
                  {user?.subscriptionName || "Тариф не выбран"}
                </p>
                {expiresLabel ? (
                  <p className="mt-1 text-sm text-muted-foreground">Действует до {expiresLabel}</p>
                ) : user?.subscriptionName === "Fix" ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Пакет Fix - слоты загрузки без календарной подписки
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Выберите тариф ниже, чтобы загружать релизы
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {renewPlanId ? (
                  <Button type="button" onClick={() => startCheckout(renewPlanId)}>
                    Продлить
                  </Button>
                ) : null}
                <Button asChild variant="outline">
                  <Link href="/cabinet/upload">Загрузить релиз</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && user?.subscriptionName && user.subscriptionName !== "Fix" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-muted-foreground" />
              Слоты артистов
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasLabelSlot ? (
              <p className="text-sm text-muted-foreground">
                Тариф Label - без лимита артистов. Дополнительные слоты не нужны.
              </p>
            ) : slots.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                После оплаты подписки здесь появится слот артиста.
              </p>
            ) : (
              <ul className="space-y-2">
                {slots.map((slot) => {
                  const active = isArtistSlotActive(slot.subscriptionExpiresAt)
                  const until = slot.subscriptionExpiresAt
                    ? format(new Date(slot.subscriptionExpiresAt), "d MMM yyyy", { locale: ru })
                    : null
                  return (
                    <li
                      key={slot.id}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm",
                        active ? "border-border bg-muted/20" : "border-dashed opacity-70"
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {slot.artistName?.trim() || "Свободный слот"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {slot.subscriptionName}
                          {until ? ` · до ${until}` : null}
                          {!active ? " · истёк" : null}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          active
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {active ? "Активен" : "Истёк"}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {canBuyExtraSlot && renewPlanId ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => startCheckout(renewPlanId, "extra_slot")}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Доп. слот артиста
                </Button>
              ) : null}
              {!hasLabelSlot ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => startCheckout("label")}
                >
                  Или Label - без лимита артистов
                </Button>
              ) : null}
            </div>
            {canBuyExtraSlot ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Доп. слот - отдельная оплата того же тарифа. Появится новый свободный слот под другого
                исполнителя; текущие слоты не продлеваются этой оплатой.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <CabinetSubscriptionAutopayPanel
        subscriptionName={user?.subscriptionName}
        variant="card"
      />

      <div>
        <h2 className="text-lg font-semibold">Тарифы</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Цены за месяц при оплате помесячно. Годовая оплата - со скидкой в окне оформления.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => {
          const isCurrent =
            !!user?.subscriptionName &&
            user.subscriptionName.toLowerCase() === plan.title.toLowerCase()
          return (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col",
                plan.popular && "border-primary/50",
                isCurrent && "ring-1 ring-primary/40"
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
                <div className="mt-auto pt-2">
                  <Button
                    type="button"
                    className="w-full"
                    variant={isCurrent ? "default" : "outline"}
                    onClick={() => startCheckout(plan.id)}
                  >
                    {isCurrent ? "Продлить" : "Выбрать"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
