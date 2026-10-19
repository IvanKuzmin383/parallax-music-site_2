"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Crown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  type PlanId,
} from "@/lib/cabinet-subscription-catalog"
import { subscriptionNameToPlanId } from "@/lib/plan-pricing"
import { UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED } from "@/lib/cabinet-upload-subscription-client"
import type { CabinetSubscriptionCheckoutParams } from "@/components/cabinet/subscription/cabinet-subscription-checkout-dialog"

export type SubscriptionPaywallStatus = {
  subscriptionName?: string | null
  subscriptionExpiresAt?: string | null
}

type Props = {
  open: boolean
  reason: string | null
  status: SubscriptionPaywallStatus | null
  onOpenChange: (open: boolean) => void
  onCheckout: (params: CabinetSubscriptionCheckoutParams) => void
}

function isArtistSlotReason(reason: string): boolean {
  const t = reason.toLowerCase()
  return t.includes("слот") || (t.includes("артист") && t.includes("тариф"))
}

export function CabinetSubscriptionPaywallDialog({
  open,
  reason,
  status,
  onOpenChange,
  onCheckout,
}: Props) {
  const message = reason?.trim() || UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED
  const renewPlanId: PlanId | null = subscriptionNameToPlanId(status?.subscriptionName)
  const slotIssue = isArtistSlotReason(message)
  const expiresAt = status?.subscriptionExpiresAt
    ? format(new Date(status.subscriptionExpiresAt), "d MMMM yyyy", { locale: ru })
    : null

  const title = slotIssue ? "Нужен слот артиста или Label" : "Нужна активная подписка"

  const startCheckout = (params: CabinetSubscriptionCheckoutParams) => {
    onOpenChange(false)
    onCheckout(params)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
            <Crown className="h-7 w-7" />
          </div>
          <DialogTitle className="text-xl">{title}</DialogTitle>
          <DialogDescription className="text-pretty">{message}</DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-muted/40 px-4 py-3.5 text-sm">
          {status?.subscriptionName ? (
            <div className="space-y-1">
              <p>
                <span className="text-muted-foreground">Сейчас: </span>
                <span className="font-medium text-foreground">{status.subscriptionName}</span>
              </p>
              {expiresAt ? (
                <p className="text-muted-foreground">Действовал до {expiresAt}</p>
              ) : status.subscriptionName === "Fix" ? (
                <p className="text-muted-foreground">Пакет Fix - проверьте доступные слоты загрузки</p>
              ) : null}
            </div>
          ) : (
            <p className="text-muted-foreground">Тариф ещё не подключен</p>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {slotIssue ? (
            <>
              <Button
                type="button"
                className="w-full"
                onClick={() => startCheckout({ planId: "label" })}
              >
                Перейти на Label
              </Button>
              {renewPlanId && renewPlanId !== "label" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() =>
                    startCheckout({ planId: renewPlanId, purchaseIntent: "extra_slot" })
                  }
                >
                  Купить доп. слот ({status?.subscriptionName})
                </Button>
              ) : null}
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href="/cabinet/subscription" onClick={() => onOpenChange(false)}>
                  Сравнить тарифы
                </Link>
              </Button>
            </>
          ) : renewPlanId ? (
            <Button
              type="button"
              className="w-full"
              onClick={() => startCheckout({ planId: renewPlanId })}
            >
              Продлить {status?.subscriptionName}
            </Button>
          ) : (
            <Button type="button" className="w-full" asChild>
              <Link href="/cabinet/subscription" onClick={() => onOpenChange(false)}>
                Выбрать тариф
              </Link>
            </Button>
          )}
          <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
