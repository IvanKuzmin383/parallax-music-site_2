"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { CabinetAuthPage } from "@/components/cabinet/auth/cabinet-auth-page"
import { CabinetDashboardPage } from "@/components/cabinet/dashboard/cabinet-dashboard-page"
import { sanitizeCabinetNextPath } from "@/lib/cabinet-next-path"

function CabinetHomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = sanitizeCabinetNextPath(searchParams.get("next"))
  const { loading, authenticated, refresh } = useCabinetSession()

  useEffect(() => {
    if (!authenticated || !nextPath) return
    router.replace(nextPath)
  }, [authenticated, nextPath, router])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <CabinetAuthPage
        onAuthenticated={() => {
          void refresh({ silent: true }).then(() => {
            if (nextPath) router.replace(nextPath)
          })
        }}
      />
    )
  }

  if (nextPath) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
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
