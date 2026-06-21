"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/cabinet/shared/page-header"
import { StatusBadge } from "@/components/cabinet/shared/status-badge"
import { EmptyState } from "@/components/cabinet/shared/empty-state"
import { useCabinetOrders } from "@/lib/cabinet/hooks/use-cabinet-orders"
import type { OrderFilterKey } from "@/lib/cabinet/order-status-map"
import { ClipboardList } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

const FILTERS: { key: OrderFilterKey; label: string }[] = [
  { key: "all", label: "Все" },
  { key: "new", label: "Новые" },
  { key: "in_progress", label: "В работе" },
  { key: "awaiting_payment", label: "Ожидает оплаты" },
  { key: "completed", label: "Выполнено" },
  { key: "cancelled", label: "Отменено" },
]

export function OrdersPageContent() {
  const [filter, setFilter] = useState<OrderFilterKey>("all")
  const { orders, loading } = useCabinetOrders(filter)

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader title="Заказы" description="Все ваши заказы услуг и их статусы" />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            size="sm"
            variant={filter === f.key ? "default" : "outline"}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : orders.length === 0 ? (
        <EmptyState title="Заказов нет" description="Оформите услугу в каталоге — заказ появится здесь" icon={ClipboardList} />
      ) : (
        <>
          <div className="hidden md:block">
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Услуга</TableHead>
                    <TableHead>Категория</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Стоимость</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}…</TableCell>
                      <TableCell>{order.serviceName}</TableCell>
                      <TableCell className="capitalize">{order.category}</TableCell>
                      <TableCell>{format(new Date(order.createdAt), "d MMM yyyy", { locale: ru })}</TableCell>
                      <TableCell>{order.amount.toLocaleString("ru-RU")} ₽</TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/cabinet/orders/${order.id}`}>Открыть</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
          <div className="md:hidden space-y-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium">{order.serviceName}</p>
                    <StatusBadge status={order.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.createdAt), "d MMM yyyy", { locale: ru })} · {order.amount.toLocaleString("ru-RU")} ₽
                  </p>
                  <Button size="sm" className="w-full" variant="outline" asChild>
                    <Link href={`/cabinet/orders/${order.id}`}>Открыть</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
