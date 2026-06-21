"use client"

import { usePathname } from "next/navigation"
import { CabinetAppShell } from "./cabinet-app-shell"
import { isCabinetAuthPath } from "@/lib/cabinet/navigation"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { Spinner } from "@/components/ui/spinner"

interface CabinetRouteShellProps {
  children: React.ReactNode
}

/**
 * Оборачивает authenticated-страницы кабинета в AppShell.
 * Auth-пути и гостевой /cabinet — без sidebar.
 */
export function CabinetRouteShell({ children }: CabinetRouteShellProps) {
  const pathname = usePathname() ?? ""
  const { loading, authenticated } = useCabinetSession()

  if (isCabinetAuthPath(pathname)) {
    return <>{children}</>
  }

  if (pathname === "/cabinet") {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      )
    }
    if (authenticated) {
      return <CabinetAppShell>{children}</CabinetAppShell>
    }
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!authenticated) {
    return <>{children}</>
  }

  return <CabinetAppShell>{children}</CabinetAppShell>
}
