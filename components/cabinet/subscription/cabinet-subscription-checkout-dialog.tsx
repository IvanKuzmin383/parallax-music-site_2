"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  calculateTotalAmount,
  getMaxPeriods,
  planIdToSubscriptionName,
  PLAN_PRICES,
  type PlanId,
} from "@/lib/plan-pricing"
import { formatMonthsCountLabel, formatPayPeriodOptionLabel } from "@/lib/pay-period-labels"

export type SubscriptionPurchaseIntent = "extra_slot"

export type CabinetSubscriptionCheckoutParams = {
  planId: PlanId
  purchaseIntent?: SubscriptionPurchaseIntent
  period?: "month" | "year"
}

type Props = {
  open: boolean
  planId: PlanId | null
  purchaseIntent?: SubscriptionPurchaseIntent
  initialPeriod?: "month" | "year"
  userEmail?: string | null
  onOpenChange: (open: boolean) => void
}

type Period = "month" | "year"

export function CabinetSubscriptionCheckoutDialog({
  open,
  planId,
  purchaseIntent,
  initialPeriod = "year",
  userEmail,
  onOpenChange,
}: Props) {
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [periodsCount, setPeriodsCount] = useState(1)
  const [agreeOffer, setAgreeOffer] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePersonalData, setAgreePersonalData] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [enableAutopay, setEnableAutopay] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setPeriod(initialPeriod)
    setPeriodsCount(1)
    setAgreeOffer(false)
    setAgreeTerms(false)
    setAgreePersonalData(false)
    setAgreePrivacy(false)
    setEnableAutopay(true)
    setLoading(false)
  }, [open, initialPeriod, planId, purchaseIntent])

  const planTitle = planId ? planIdToSubscriptionName(planId) : ""
  const isExtraSlot = purchaseIntent === "extra_slot"
  const maxPeriods = getMaxPeriods(period)
  const pricePerMonth = planId
    ? period === "month"
      ? PLAN_PRICES[planId].priceMonth
      : PLAN_PRICES[planId].priceYearMonthly
    : 0
  const totalMonths = periodsCount * (period === "month" ? 1 : 12)
  const totalAmount = useMemo(
    () => (planId ? calculateTotalAmount(planId, period, periodsCount) : 0),
    [planId, period, periodsCount]
  )

  const canSubmit =
    !!planId &&
    !!userEmail?.trim() &&
    agreeOffer &&
    agreeTerms &&
    agreePersonalData &&
    agreePrivacy

  const handlePay = async () => {
    if (!planId || loading) return
    if (!canSubmit) {
      toast.error("Подтвердите все согласия и убедитесь, что вы вошли в кабинет")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          planId,
          period,
          periodsCount,
          email: userEmail!.trim(),
          consentPublicOffer: true,
          consentTermsOfUse: true,
          consentPersonalData: true,
          consentPrivacyPolicy: true,
          enableRecurrent: enableAutopay,
          fromCabinet: true,
          returnPath: "/cabinet/subscription",
          ...(isExtraSlot ? { purchaseIntent: "extra_slot" } : {}),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        confirmationUrl?: string
        error?: string
      }
      if (res.ok && data.confirmationUrl) {
        window.location.href = data.confirmationUrl
        return
      }
      toast.error(data.error || "Не удалось создать платёж")
    } catch {
      toast.error("Не удалось создать платёж")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="space-y-1.5 border-b px-6 py-5 text-left">
          <DialogTitle>
            {isExtraSlot ? "Дополнительный слот артиста" : `Оплата - ${planTitle}`}
          </DialogTitle>
          {isExtraSlot ? (
            <DialogDescription className="text-pretty">
              Новый свободный слот тарифа {planTitle}. Текущие артисты и сроки их слотов не
              затрагиваются.
            </DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {userEmail ? (
            <div className="rounded-xl bg-muted/40 px-3.5 py-2.5 text-sm">
              <span className="text-muted-foreground">Email: </span>
              <span className="font-medium">{userEmail}</span>
            </div>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Войдите в кабинет, чтобы оформить оплату.
            </p>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium">Срок</p>
            <Tabs
              value={period}
              onValueChange={(v) => {
                setPeriod(v as Period)
                if (v === "year") setPeriodsCount(1)
              }}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="month" disabled={loading}>
                  Помесячно
                </TabsTrigger>
                <TabsTrigger value="year" disabled={loading}>
                  За год
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={periodsCount}
              onChange={(e) => setPeriodsCount(parseInt(e.target.value, 10))}
              disabled={loading}
              aria-label="Количество периодов"
            >
              {Array.from({ length: maxPeriods }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {formatPayPeriodOptionLabel(n, period, "ru")}
                </option>
              ))}
            </select>
            <p className="text-sm text-muted-foreground">
              {pricePerMonth.toLocaleString("ru-RU")} ₽/мес × {formatMonthsCountLabel(totalMonths, "ru")} ={" "}
              <span className="font-semibold text-foreground">
                {totalAmount.toLocaleString("ru-RU")} ₽
              </span>
            </p>
          </div>

          <div className="space-y-3">
            <ConsentRow
              id="cab-agree-offer"
              checked={agreeOffer}
              onCheckedChange={setAgreeOffer}
              disabled={loading}
            >
              Я согласен с{" "}
              <DocLink href="/offer">публичной офертой и лицензионными условиями</DocLink>
            </ConsentRow>
            <ConsentRow
              id="cab-agree-terms"
              checked={agreeTerms}
              onCheckedChange={setAgreeTerms}
              disabled={loading}
            >
              Я согласен с <DocLink href="/terms">условиями использования</DocLink>
            </ConsentRow>
            <ConsentRow
              id="cab-agree-pd"
              checked={agreePersonalData}
              onCheckedChange={setAgreePersonalData}
              disabled={loading}
            >
              Я согласен на{" "}
              <DocLink href="/personal-data-consent">обработку персональных данных</DocLink>
            </ConsentRow>
            <ConsentRow
              id="cab-agree-privacy"
              checked={agreePrivacy}
              onCheckedChange={setAgreePrivacy}
              disabled={loading}
            >
              Я согласен с <DocLink href="/privacy">политикой конфиденциальности</DocLink>
            </ConsentRow>
          </div>

          <div className="rounded-xl border p-3.5 space-y-2">
            <ConsentRow
              id="cab-enable-autopay"
              checked={enableAutopay}
              onCheckedChange={setEnableAutopay}
              disabled={loading}
              labelClassName="font-medium"
            >
              Подключить автопродление
            </ConsentRow>
            <p className="pl-7 text-xs text-muted-foreground leading-relaxed">
              {enableAutopay
                ? "Карта сохранится для следующих списаний. На форме оплаты могут быть недоступны SberPay и другие кошельки."
                : "Оплачивается только выбранный срок. Автосписание не подключится."}
            </p>
          </div>
        </div>

        <div className="border-t px-6 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Итого</span>
            <span className="text-xl font-semibold tabular-nums">
              {totalAmount.toLocaleString("ru-RU")} ₽
            </span>
          </div>
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={!canSubmit || loading}
            onClick={() => void handlePay()}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создаём платёж…
              </>
            ) : (
              "Перейти к оплате"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function DocLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </Link>
  )
}

function ConsentRow({
  id,
  checked,
  onCheckedChange,
  disabled,
  children,
  labelClassName,
}: {
  id: string
  checked: boolean
  onCheckedChange: (v: boolean) => void
  disabled?: boolean
  children: React.ReactNode
  labelClassName?: string
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(Boolean(v))}
        disabled={disabled}
        className="mt-0.5"
      />
      <label
        htmlFor={id}
        className={cn("cursor-pointer text-sm leading-snug", labelClassName)}
      >
        {children}
      </label>
    </div>
  )
}
