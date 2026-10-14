"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { ORDER_TIMELINE_STEPS } from "@/lib/cabinet/order-status-map"
import { useCabinetOrderById } from "@/lib/cabinet/hooks/use-cabinet-orders"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

interface OrderDetailPageContentProps {
  orderId: string
}

function timelineActiveIndex(status: string): number {
  if (status === "awaiting_payment") return 1
  if (status === "paid") return 2
  if (status === "in_progress" || status === "review") return 4
  if (status === "completed") return 5
  return 0
}

export function OrderDetailPageContent({ orderId }: OrderDetailPageContentProps) {
  const { order, loading } = useCabinetOrderById(orderId)
  const activeStep = order ? timelineActiveIndex(order.status) : 0

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/cabinet/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />К заказам
          </Link>
        </Button>
        <p className="text-muted-foreground">Заказ не найден</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-3">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/cabinet/orders">
          <ArrowLeft className="mr-2 h-4 w-4" />К заказам
        </Link>
      </Button>

      <PageHeader title={order.serviceName} className="mb-3 sm:mb-4">
        <StatusBadge status={order.status} />
      </PageHeader>

      <div className="grid gap-2 sm:grid-cols-3">
        <Card className="gap-0 py-0">
          <CardContent className="space-y-0.5 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Стоимость</p>
            <p className="text-lg font-bold leading-none tabular-nums">
              {order.amount.toLocaleString("ru-RU")} ₽
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="space-y-0.5 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Дата создания</p>
            <p className="text-sm font-medium leading-snug">
              {format(new Date(order.createdAt), "d MMMM yyyy", { locale: ru })}
            </p>
          </CardContent>
        </Card>
        <Card className="gap-0 py-0">
          <CardContent className="space-y-0.5 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">ID заказа</p>
            <p className="break-all font-mono text-xs leading-snug">{order.id}</p>
          </CardContent>
        </Card>
      </div>

      {order.description ? (
        <Card className="gap-0 py-0">
          <CardContent className="space-y-1.5 px-3 py-2.5">
            <p className="text-sm font-medium">Описание</p>
            <p className="text-sm text-muted-foreground">{order.description}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="gap-0 py-0">
        <CardContent className="space-y-2 px-3 py-2.5">
          <p className="text-sm font-medium">Таймлайн статусов</p>
          <ol className="space-y-1.5">
            {ORDER_TIMELINE_STEPS.map((step, index) => (
              <li key={step.key} className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-medium",
                    index <= activeStep
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>
                <p
                  className={cn(
                    "text-sm leading-none",
                    index <= activeStep ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
