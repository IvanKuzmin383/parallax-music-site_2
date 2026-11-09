"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { trackGoalOnce } from "@/lib/analytics"

type OrderStatus = "pending" | "paid" | "failed"
type ViewState = "checking" | "paid" | "failed" | "waiting"

const POLL_INTERVAL_MS = 2000
const MAX_ATTEMPTS = 30

type StatusResponse = { status?: string; orderType?: string }

async function fetchOrderStatus(orderId: string): Promise<{ status: OrderStatus | "unknown"; orderType?: string }> {
  const res = await fetch(`/api/payments/order-status?orderId=${encodeURIComponent(orderId)}`, {
    cache: "no-store",
  })
  if (res.status === 404) return { status: "unknown" }
  if (!res.ok) throw new Error(`status ${res.status}`)
  const data = (await res.json()) as StatusResponse
  const status = data.status === "paid" || data.status === "failed" || data.status === "pending" ? data.status : "unknown"
  return { status, orderType: data.orderType }
}

type PaymentReturnStatusProps = {
  orderId: string
  /** Что написано в URL возврата. Влияет только на подсказку, успех подтверждается сервером. */
  hint: "return" | "fail"
  /** Для гостя: после успеха предлагаем создать кабинет на тот же email. */
  guest?: boolean
  /** Куда вести кнопкой после успеха для авторизованного пользователя. */
  continueHref?: string
  continueLabel?: string
  onPaid?: () => void
  className?: string
}

/**
 * Состояния возврата после оплаты: проверка, успех, ошибка, ожидание.
 * Успех показывается только если сервер подтвердил статус заказа (вебхук платёжной системы).
 */
export function PaymentReturnStatus({
  orderId,
  hint,
  guest = false,
  continueHref = "/cabinet",
  continueLabel = "Перейти в кабинет",
  onPaid,
  className,
}: PaymentReturnStatusProps) {
  const [view, setView] = useState<ViewState>("checking")
  const [orderType, setOrderType] = useState<string | undefined>()
  const cancelledRef = useRef(false)
  const onPaidRef = useRef(onPaid)
  onPaidRef.current = onPaid

  const poll = useCallback(async () => {
    setView("checking")
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (cancelledRef.current) return
      try {
        const result = await fetchOrderStatus(orderId)
        if (cancelledRef.current) return
        if (result.status === "paid") {
          setOrderType(result.orderType)
          setView("paid")
          trackGoalOnce(orderId, "purchase_success", {
            order_type: result.orderType && /^[a-z0-9_]+$/i.test(result.orderType) ? result.orderType : undefined,
            method: "card",
          })
          onPaidRef.current?.()
          return
        }
        if (result.status === "failed") {
          setView("failed")
          return
        }
        if (result.status === "unknown") {
          setView("failed")
          return
        }
        // Банк вернул пользователя по ссылке ошибки и статус так и не подтвердился.
        if (hint === "fail" && attempt >= 2) {
          setView("failed")
          return
        }
      } catch {
        // сетевая ошибка - пробуем ещё
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
    }
    if (!cancelledRef.current) setView("waiting")
  }, [orderId, hint])

  useEffect(() => {
    cancelledRef.current = false
    void poll()
    return () => {
      cancelledRef.current = true
    }
  }, [poll])

  const isSubscriptionLike = orderType === "subscription" || orderType === "fix_pack"

  return (
    <div
      className={className ?? "rounded-xl border border-border/60 bg-card/60 p-6 text-center backdrop-blur"}
      role="status"
      aria-live="polite"
    >
      {view === "checking" ? (
        <div className="space-y-3">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" aria-hidden />
          <h2 className="text-lg font-semibold">Проверяем оплату</h2>
          <p className="text-sm text-muted-foreground">
            Ждём подтверждение от банка. Обычно это занимает несколько секунд, страницу можно не закрывать.
          </p>
        </div>
      ) : null}

      {view === "paid" ? (
        <div className="space-y-4">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" aria-hidden />
          <h2 className="text-lg font-semibold">Оплата подтверждена</h2>
          {guest ? (
            <>
              <p className="text-sm text-muted-foreground">
                {isSubscriptionLike
                  ? "Создайте кабинет на тот же email, который вы указали при оплате. Оплаченный тариф или треки появятся в нём автоматически."
                  : "Создайте кабинет на тот же email, который вы указали при оплате."}
              </p>
              <Button asChild>
                <Link href="/cabinet?tab=register">Создать кабинет</Link>
              </Button>
            </>
          ) : (
            <Button asChild>
              <Link href={continueHref}>{continueLabel}</Link>
            </Button>
          )}
        </div>
      ) : null}

      {view === "failed" ? (
        <div className="space-y-4">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" aria-hidden />
          <h2 className="text-lg font-semibold">Оплата не завершена</h2>
          <p className="text-sm text-muted-foreground">
            Деньги не списаны или платёж отклонён банком. Попробуйте ещё раз или выберите другой способ оплаты.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild variant="outline">
              <Link href={guest ? "/pricing" : "/cabinet/subscription"}>Вернуться к тарифам</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {view === "waiting" ? (
        <div className="space-y-4">
          <Loader2 className="mx-auto h-8 w-8 text-amber-400" aria-hidden />
          <h2 className="text-lg font-semibold">Платёж ещё обрабатывается</h2>
          <p className="text-sm text-muted-foreground">
            Банк пока не подтвердил оплату. Если деньги списаны, статус обновится в течение нескольких минут.
            {guest ? " Мы пришлём письмо со ссылкой на регистрацию." : ""}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button type="button" variant="outline" onClick={() => void poll()}>
              Проверить ещё раз
            </Button>
            {!guest ? (
              <Button asChild variant="ghost">
                <Link href={continueHref}>{continueLabel}</Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
