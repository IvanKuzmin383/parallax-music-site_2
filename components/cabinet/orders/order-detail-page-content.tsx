"use client"

import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
          <Link href="/cabinet/orders"><ArrowLeft className="h-4 w-4 mr-2" />К заказам</Link>
        </Button>
        <p className="text-muted-foreground">Заказ не найден</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/cabinet/orders"><ArrowLeft className="h-4 w-4 mr-2" />К заказам</Link>
      </Button>

      <PageHeader title={order.serviceName}>
        <StatusBadge status={order.status} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Стоимость</p>
            <p className="text-xl font-bold">{order.amount.toLocaleString("ru-RU")} ₽</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Дата создания</p>
            <p className="font-medium">{format(new Date(order.createdAt), "d MMMM yyyy", { locale: ru })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">ID заказа</p>
            <p className="font-mono text-xs break-all">{order.id}</p>
          </CardContent>
        </Card>
      </div>

      {order.description ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Описание</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{order.description}</p></CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-base">Таймлайн статусов</CardTitle></CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {ORDER_TIMELINE_STEPS.map((step, index) => (
              <li key={step.key} className="flex gap-3">
                <div
                  className={cn(
                    "h-8 w-8 rounded-full border-2 flex items-center justify-center text-xs shrink-0",
                    index <= activeStep ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"
                  )}
                >
                  {index + 1}
                </div>
                <div className="pt-1">
                  <p className={cn("text-sm font-medium", index <= activeStep ? "text-foreground" : "text-muted-foreground")}>
                    {step.label}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Комментарии</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {order.isMock
              ? "Демо-заказ. Переписка с менеджером будет доступна после подключения API."
              : "Переписка по заказу будет отображаться здесь."}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
