"use client"

import { useCallback, useEffect, useState } from "react"
import type { OrderView } from "../types"
import type { OrderFilterKey } from "../order-status-map"
import { matchesOrderFilter } from "../order-status-map"
import { mapServiceFulfillmentToOrderView } from "../adapters/map-service-fulfillment"
import { MOCK_ORDERS } from "../mock"

export function useCabinetOrders(filter: OrderFilterKey = "all") {
  const [orders, setOrders] = useState<OrderView[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const apiFilter =
        filter === "in_progress" ? "in_work" : filter === "completed" ? "done" : filter === "new" ? "all" : "all"
      const res = await fetch(`/api/cabinet/service-fulfillments?filter=${encodeURIComponent(apiFilter)}`, {
        credentials: "include",
      })
      let apiOrders: OrderView[] = []
      if (res.ok) {
        const data = (await res.json()) as { items?: Parameters<typeof mapServiceFulfillmentToOrderView>[0][] }
        apiOrders = (data.items ?? []).map(mapServiceFulfillmentToOrderView)
      }
      const merged = [...apiOrders, ...MOCK_ORDERS]
      const filtered = merged.filter((o) => matchesOrderFilter(o.status, filter))
      setOrders(filtered)
    } catch {
      setOrders(MOCK_ORDERS.filter((o) => matchesOrderFilter(o.status, filter)))
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
