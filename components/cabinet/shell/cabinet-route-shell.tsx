"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { CabinetAppShell } from "./cabinet-app-shell"
import { isCabinetAuthPath } from "@/lib/cabinet/navigation"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { Spinner } from "@/components/ui/spinner"

interface CabinetRouteShellProps {
  children: React.ReactNode
}

/**
 * Оборачивает authenticated-страницы кабинета в AppShell.
 * Auth-пути и гостевой /cabinet - без sidebar.
 * Остальные пути без сессии - редирект на /cabinet (логин).
 */
export function CabinetRouteShell({ children }: CabinetRouteShellProps) {
  const pathname = usePathname() ?? ""
  const router = useRouter()
  const { loading, authenticated } = useCabinetSession()
  const isAuthPath = isCabinetAuthPath(pathname)
  const isGuestCabinetHome = pathname === "/cabinet"

  useEffect(() => {
    if (loading || authenticated || isAuthPath || isGuestCabinetHome) return
    router.replace("/cabinet")
  }, [loading, authenticated, isAuthPath, isGuestCabinetHome, router])

  if (isAuthPath) {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (isGuestCabinetHome) {
    if (authenticated) {
      return <CabinetAppShell>{children}</CabinetAppShell>
    }
    return <>{children}</>
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return <CabinetAppShell>{children}</CabinetAppShell>
}
