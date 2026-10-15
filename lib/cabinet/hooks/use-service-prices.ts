"use client"

import { useCallback, useEffect, useState } from "react"
import type { ServicePriceKey } from "@/lib/service-prices"

export type PublicServicePrice = {
  key: ServicePriceKey
  priceRub: number
  compareAtRub: number | null
  discountPercent: number | null
  cardLabel: string
  unitHint: string | null
}

let cache: PublicServicePrice[] | null = null
let cachePromise: Promise<PublicServicePrice[] | null> | null = null

async function fetchServicePrices(): Promise<PublicServicePrice[] | null> {
  if (cache) return cache
  if (cachePromise) return cachePromise
  cachePromise = (async () => {
    try {
      const res = await fetch("/api/cabinet/service-prices", { credentials: "include" })
      if (!res.ok) return null
      const data = (await res.json()) as { items?: PublicServicePrice[] }
      cache = data.items ?? []
      return cache
    } catch {
      return null
    } finally {
      cachePromise = null
    }
  })()
  return cachePromise
}

export function useServicePrices() {
  const [items, setItems] = useState<PublicServicePrice[] | null>(cache)
  const [loading, setLoading] = useState(!cache)

  const reload = useCallback(async () => {
    cache = null
    setLoading(true)
    const next = await fetchServicePrices()
    setItems(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next = await fetchServicePrices()
      if (!cancelled) {
        setItems(next)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const byKey = (key: ServicePriceKey): PublicServicePrice | null =>
    items?.find((i) => i.key === key) ?? null

  return { items, loading, byKey, reload }
}
