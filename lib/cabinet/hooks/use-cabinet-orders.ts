"use client"

import { useCallback, useEffect, useState } from "react"
import type { OrderView } from "../types"
import type { OrderFilterKey } from "../order-status-map"
import { matchesOrderFilter } from "../order-status-map"
import { mapServiceFulfillmentToOrderView } from "../adapters/map-service-fulfillment"
import { masteringFileOrderId } from "@/lib/tools-mastering-pricing"

type MasteringFileApiItem = {
  id: string
  fileName: string
  used?: "free" | "credit"
  createdAt: string
  expiresAt: string
  downloadPath: string
}

function mapMasteringFileToOrderView(item: MasteringFileApiItem): OrderView {
  return {
    id: masteringFileOrderId(item.id),
    serviceName: "Онлайн-мастеринг",
    category: "ai",
    createdAt: item.createdAt,
    amount: 0,
    status: "completed",
    trackName: item.fileName,
    description:
      item.used === "free"
        ? "Бесплатное скачивание · повторно из заказов"
        : "Скачивание по кредиту · повторно из заказов",
    kind: "mastering_file",
    downloadHref: item.downloadPath,
    expiresAt: item.expiresAt,
    isMock: false,
  }
}

export function useCabinetOrders(filter: OrderFilterKey = "all") {
  const [orders, setOrders] = useState<OrderView[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const apiFilter =
        filter === "in_progress" ? "in_work" : filter === "completed" ? "done" : filter === "new" ? "all" : "all"
      const [fulfillmentsRes, masteringRes] = await Promise.all([
        fetch(`/api/cabinet/service-fulfillments?filter=${encodeURIComponent(apiFilter)}`, {
          credentials: "include",
        }),
        fetch("/api/cabinet/tools/mastering/files", { credentials: "include" }),
      ])
      let apiOrders: OrderView[] = []
      if (fulfillmentsRes.ok) {
        const data = (await fulfillmentsRes.json()) as {
          items?: Parameters<typeof mapServiceFulfillmentToOrderView>[0][]
        }
        apiOrders = (data.items ?? []).map(mapServiceFulfillmentToOrderView)
      }
      if (masteringRes.ok) {
        const data = (await masteringRes.json()) as { items?: MasteringFileApiItem[] }
        apiOrders = [...apiOrders, ...(data.items ?? []).map(mapMasteringFileToOrderView)]
      }
      apiOrders.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const filtered = apiOrders.filter((o) => matchesOrderFilter(o.status, filter))
      setOrders(filtered)
    } catch {
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  return { orders, loading, reload: load }
}

export function useCabinetOrderById(orderId: string) {
  const { orders, loading } = useCabinetOrders("all")
  const order = orders.find((o) => o.id === orderId)
  return { order, loading }
}
