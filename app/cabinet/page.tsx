"use client"

import { Suspense } from "react"
import { Spinner } from "@/components/ui/spinner"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { CabinetAuthPage } from "@/components/cabinet/auth/cabinet-auth-page"
import { CabinetDashboardPage } from "@/components/cabinet/dashboard/cabinet-dashboard-page"

function CabinetHomeContent() {
  const { loading, authenticated, refresh } = useCabinetSession()

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!authenticated) {
    return <CabinetAuthPage onAuthenticated={() => void refresh({ silent: true })} />
  }

  return <CabinetDashboardPage />
}

export default function CabinetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <CabinetHomeContent />
    </Suspense>
  )
}
