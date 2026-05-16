"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import {
  isCabinetPathAllowedWhenSubscriptionExpired,
  isCabinetSubscriptionExpiredForNavigation,
} from "@/lib/cabinet-subscription-gate"

type GateState = "checking" | "allow" | "redirecting"

export function CabinetSubscriptionExpiredGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [gate, setGate] = useState<GateState>("checking")

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setGate("checking")
      try {
        const res = await fetch("/api/cabinet/user", { credentials: "include" })
        if (cancelled) return

        if (res.status === 401) {
          setGate("allow")
          return
        }

        if (!res.ok) {
          setGate("allow")
          return
        }

        const data = (await res.json().catch(() => ({}))) as {
          user?: { subscriptionName?: string; subscriptionExpiresAt?: string }
        }
        const user = data?.user

        if (!isCabinetSubscriptionExpiredForNavigation(user)) {
          setGate("allow")
          return
        }

        if (isCabinetPathAllowedWhenSubscriptionExpired(pathname)) {
          setGate("allow")
          return
        }

        setGate("redirecting")
        router.replace("/cabinet")
      } catch {
        if (!cancelled) setGate("allow")
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [pathname, router])

  if (gate === "redirecting") {
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center text-muted-foreground">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (gate === "checking") {
    if (pathname === "/cabinet" || isCabinetPathAllowedWhenSubscriptionExpired(pathname)) {
      return <>{children}</>
    }
    return (
      <div className="min-h-screen pt-20 flex items-center justify-center text-muted-foreground">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return <>{children}</>
}
