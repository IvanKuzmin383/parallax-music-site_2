"use client"

import { useCallback, useEffect, useState } from "react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useCabinetSubscription } from "@/components/cabinet/subscription/cabinet-subscription-provider"
import { subscriptionNameToPlanId } from "@/lib/plan-pricing"

type AutopayInfo = {
  autopayEnabled: boolean
  autopayNextChargeAt: string | null
  nextAmountRub: string | null
  disableDeadlineYmd: string | null
  manualDisableEmail: string
}

type Props = {
  subscriptionName?: string | null
  /** Компактная строка в профиле или полный блок на хабе */
  variant?: "row" | "card"
}

export function CabinetSubscriptionAutopayPanel({
  subscriptionName,
  variant = "card",
}: Props) {
  const { openCheckout } = useCabinetSubscription()
  const [info, setInfo] = useState<AutopayInfo | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const renewPlanId = subscriptionNameToPlanId(subscriptionName)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/cabinet/subscription/autopay", { credentials: "include" })
      if (!res.ok) {
        setInfo({
          autopayEnabled: false,
          autopayNextChargeAt: null,
          nextAmountRub: null,
          disableDeadlineYmd: null,
          manualDisableEmail: "parallaxmusiclabel@gmail.com",
        })
        return
      }
      const data = (await res.json()) as AutopayInfo
      setInfo(data)
    } catch {
      setInfo({
        autopayEnabled: false,
        autopayNextChargeAt: null,
        nextAmountRub: null,
        disableDeadlineYmd: null,
        manualDisableEmail: "parallaxmusiclabel@gmail.com",
      })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!subscriptionName || subscriptionName === "Fix") return null

  const row = (
    <Card className="border-border py-0 gap-0">
      <CardContent className="flex items-center gap-3 py-3 px-4">
        {info == null ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
        ) : info.autopayEnabled ? (
          <Check className="h-5 w-5 shrink-0 text-green-600" strokeWidth={2.5} aria-hidden />
        ) : (
          <X className="h-5 w-5 shrink-0 text-red-500" strokeWidth={2.5} aria-hidden />
        )}
        <button
          type="button"
          className="text-left text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setDialogOpen(true)}
        >
          Автопродление подписки
          {info
            ? info.autopayEnabled
              ? " · включено"
              : " · выключено"
            : ""}
        </button>
      </CardContent>
    </Card>
  )

  return (
    <>
      {variant === "row" ? (
        row
      ) : (
        <Card className="gap-0 py-0">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none">Автопродление</p>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {info == null
                  ? "Загрузка…"
                  : info.autopayEnabled
                    ? "Карта сохранена, списание по расписанию"
                    : "Не активно - подключится при следующей оплате с галочкой автопродления"}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
              Управление
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Автопродление подписки</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            {info?.autopayEnabled ? (
              <>
                {info.autopayNextChargeAt ? (
                  <p>
                    <span className="text-muted-foreground">Плановое списание: </span>
                    {format(new Date(info.autopayNextChargeAt), "d MMMM yyyy", { locale: ru })}{" "}
                    (московское время)
                  </p>
                ) : null}
                {info.nextAmountRub ? (
                  <p>
                    <span className="text-muted-foreground">Сумма: </span>
                    {info.nextAmountRub} ₽
                  </p>
                ) : null}
                {info.disableDeadlineYmd ? (
                  <p className="text-muted-foreground">
                    Чтобы отключить до очередного списания (рабочие дни РФ), лучше сделать это не
                    позднее {info.disableDeadlineYmd.split("-").reverse().join(".")}.
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      const res = await fetch("/api/cabinet/subscription/autopay", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ action: "request_disable" }),
                      })
                      const data = await res.json().catch(() => ({}))
                      if (res.ok) {
                        toast.success("Проверьте почту - ссылка для подтверждения отключения")
                      } else {
                        toast.error(
                          typeof data.error === "string"
                            ? data.error
                            : "Не удалось отправить письмо"
                        )
                      }
                    } catch {
                      toast.error("Ошибка сети")
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Отключить автопродление (письмо)
                </Button>
                {info.manualDisableEmail ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Либо напишите на {info.manualDisableEmail} с того же email, что указан в аккаунте
                    или при оплате - см. п. 5.5 оферты.
                  </p>
                ) : null}
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  Автопродление не активно (нет сохранённой карты или отключено). Оплатите тариф с
                  галочкой автопродления - карта сохранится для следующих списаний.
                </p>
                {renewPlanId ? (
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setDialogOpen(false)
                      openCheckout({ planId: renewPlanId })
                    }}
                  >
                    Продлить подписку
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
