"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { ArrowLeft, Check, Download, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
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

function timelineStepState(
  index: number,
  activeStep: number,
  status: string
): "done" | "failed" | "pending" {
  if (status === "cancelled" || status === "rejected") {
    return index === 0 ? "done" : "failed"
  }
  if (index <= activeStep) return "done"
  return "pending"
}

export function OrderDetailPageContent({ orderId }: OrderDetailPageContentProps) {
  const router = useRouter()
  const { order, loading } = useCabinetOrderById(orderId)
  const activeStep = order ? timelineActiveIndex(order.status) : 0
  const isMasteringFile = order?.kind === "mastering_file"

  useEffect(() => {
    if (loading || order) return
    toast.message("Этот платёж не отображается в разделе «Заказы»")
    router.replace("/cabinet/orders")
  }, [loading, order, router])

  if (loading || !order) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-8">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/cabinet/orders">
          <ArrowLeft className="mr-2 h-4 w-4" />К заказам
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem] md:leading-tight">
          {order.serviceName}
        </h1>
        <StatusBadge status={order.status} />
      </div>

      <dl className="grid gap-6 sm:grid-cols-3">
        <div className="space-y-1">
          <dt className="text-xs text-muted-foreground">Стоимость</dt>
          <dd className="text-lg font-bold leading-none tabular-nums">
            {order.amount.toLocaleString("ru-RU")} ₽
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-muted-foreground">Дата создания</dt>
          <dd className="text-sm font-medium leading-snug">
            {format(new Date(order.createdAt), "d MMMM yyyy", { locale: ru })}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-muted-foreground">
            {isMasteringFile ? "Файл" : "ID заказа"}
          </dt>
          <dd className="break-all font-mono text-xs leading-snug">
            {isMasteringFile ? order.trackName || order.id : order.id}
          </dd>
        </div>
      </dl>

      {isMasteringFile ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">Готовый мастер</p>
            <p className="text-sm text-muted-foreground">
              {order.trackName || "master.wav"}
              {order.expiresAt
                ? ` · доступен до ${format(new Date(order.expiresAt), "d MMMM yyyy HH:mm", { locale: ru })}`
                : ""}
            </p>
            {order.description ? (
              <p className="text-xs text-muted-foreground">{order.description}</p>
            ) : null}
          </div>
          {order.downloadHref ? (
            <Button type="button" asChild>
              <a href={order.downloadHref} download={order.trackName || "master.wav"}>
                <Download className="mr-2 h-4 w-4" />
                Скачать WAV
              </a>
            </Button>
          ) : (
            <p className="text-sm text-destructive">Ссылка на скачивание недоступна</p>
          )}
        </div>
      ) : null}

      {!isMasteringFile &&
      (order.trackName || order.artistName || (order.addonLines && order.addonLines.length > 0)) ? (
        <div className="space-y-3">
          <p className="text-sm font-medium">Состав заказа</p>
          {order.trackName || order.artistName ? (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Трек / релиз</p>
              <p className="text-sm font-medium text-foreground">
                {order.trackName || "Без названия"}
                {order.artistName ? (
                  <span className="font-normal text-muted-foreground"> · {order.artistName}</span>
                ) : null}
              </p>
            </div>
          ) : null}
          {order.addonLines && order.addonLines.length > 0 ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Услуги</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-foreground">
                {order.addonLines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : !isMasteringFile && order.description ? (
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Описание</p>
          <p className="text-sm text-muted-foreground">{order.description}</p>
        </div>
      ) : null}

      {!isMasteringFile ? (
        <div className="space-y-4">
          <p className="text-sm font-medium">Таймлайн статусов</p>
          <ol className="space-y-4">
            {ORDER_TIMELINE_STEPS.map((step, index) => {
              const state = timelineStepState(index, activeStep, order.status)
              return (
                <li key={step.key} className="flex items-center gap-3">
                  {state === "failed" ? (
                    <X className="h-5 w-5 shrink-0 text-destructive" aria-hidden />
                  ) : (
                    <Check
                      className={cn(
                        "h-5 w-5 shrink-0",
                        state === "done" ? "text-primary" : "text-muted-foreground/35"
                      )}
                      aria-hidden
                    />
                  )}
                  <p
                    className={cn(
                      "text-sm leading-none",
                      state === "done"
                        ? "font-medium text-foreground"
                        : state === "failed"
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}
    </div>
  )
}
