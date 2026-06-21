"use client"

import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import { CabinetAuthPage } from "@/components/cabinet/auth/cabinet-auth-page"
import { CabinetDashboardPage } from "@/components/cabinet/dashboard/cabinet-dashboard-page"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"

function CabinetPageInner() {
  const { loading, authenticated, refresh } = useCabinetSession()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!authenticated) {
    return <CabinetAuthPage onAuthenticated={() => void refresh()} />
  }

  return <CabinetDashboardPage />
}

export default function CabinetPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <CabinetPageInner />
    </Suspense>
  )
}
