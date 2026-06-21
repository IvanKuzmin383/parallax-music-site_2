"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { CabinetUserView } from "../types"

interface CabinetUserResponse {
  user?: {
    email?: string
    displayName?: string
    streamingBalance?: number
    subscriptionName?: string
    subscriptionExpiresAt?: string
  }
}

export function useCabinetSession() {
  const router = useRouter()
  const [user, setUser] = useState<CabinetUserView | null>(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/cabinet/user", { credentials: "include" })
      if (res.status === 401) {
        setUser(null)
        setAuthenticated(false)
        return null
      }
      if (!res.ok) {
        setUser(null)
        setAuthenticated(false)
        return null
      }
      const data = (await res.json()) as CabinetUserResponse
      const u = data.user
      if (!u?.email) {
        setUser(null)
        setAuthenticated(false)
        return null
      }
      const view: CabinetUserView = {
        email: u.email,
        displayName: u.displayName,
        streamingBalance: u.streamingBalance ?? 0,
        subscriptionName: u.subscriptionName,
        subscriptionExpiresAt: u.subscriptionExpiresAt,
      }
      setUser(view)
      setAuthenticated(true)
      return view
    } catch {
      setUser(null)
      setAuthenticated(false)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const requireAuth = useCallback(() => {
    if (!loading && !authenticated) {
      router.replace("/cabinet")
    }
  }, [loading, authenticated, router])

  const logout = useCallback(async () => {
    try {
      await fetch("/api/cabinet/auth", { method: "DELETE", credentials: "include" })
    } catch {
      // ignore
    }
    window.location.href = "/cabinet"
  }, [])

  return { user, loading, authenticated, refresh, requireAuth, logout }
}
