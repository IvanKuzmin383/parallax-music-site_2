"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
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

interface CabinetSessionContextValue {
  user: CabinetUserView | null
  loading: boolean
  authenticated: boolean
  refresh: (options?: { silent?: boolean }) => Promise<CabinetUserView | null>
  requireAuth: () => void
  logout: () => Promise<void>
}

const CabinetSessionContext = createContext<CabinetSessionContextValue | null>(null)

export function CabinetSessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<CabinetUserView | null>(null)
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true)
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

  const value = useMemo(
    () => ({ user, loading, authenticated, refresh, requireAuth, logout }),
    [user, loading, authenticated, refresh, requireAuth, logout]
  )

  return <CabinetSessionContext.Provider value={value}>{children}</CabinetSessionContext.Provider>
}

export function useCabinetSession(): CabinetSessionContextValue {
  const ctx = useContext(CabinetSessionContext)
  if (!ctx) {
    throw new Error("useCabinetSession must be used within CabinetSessionProvider")
  }
  return ctx
}
