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
let cacheAt = 0
let cachePromise: Promise<PublicServicePrice[] | null> | null = null
/** После правки в админке карточки не должны жить на старом in-memory кэше весь сеанс. */
const CACHE_TTL_MS = 15_000

async function fetchServicePrices(force = false): Promise<PublicServicePrice[] | null> {
  const fresh = cache && Date.now() - cacheAt < CACHE_TTL_MS
  if (!force && fresh) return cache
  if (cachePromise) return cachePromise
  cachePromise = (async () => {
    try {
      const res = await fetch("/api/cabinet/service-prices", {
        credentials: "include",
        cache: "no-store",
      })
      if (!res.ok) return cache
      const data = (await res.json()) as { items?: PublicServicePrice[] }
      cache = data.items ?? []
      cacheAt = Date.now()
      return cache
    } catch {
      return cache
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
    setLoading(true)
    const next = await fetchServicePrices(true)
    setItems(next)
    setLoading(false)
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const next = await fetchServicePrices(true)
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
