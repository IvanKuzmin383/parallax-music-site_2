"use client"

import { Suspense, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import { CabinetAuthPage } from "@/components/cabinet/auth/cabinet-auth-page"
import { CabinetDashboardPage } from "@/components/cabinet/dashboard/cabinet-dashboard-page"
import { sanitizeCabinetNextPath } from "@/lib/cabinet-next-path"
import { PaymentReturnStatus } from "@/components/payments/payment-return-status"

function CabinetHomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = sanitizeCabinetNextPath(searchParams.get("next"))
  const { loading, authenticated, refresh } = useCabinetSession()

  // Возврат из банка по старым ссылкам /cabinet?payment=return&orderId=...: статус проверяет сервер.
  const paymentParam = searchParams.get("payment")
  const paymentOrderId = searchParams.get("orderId")
  const hasPaymentReturn = Boolean(paymentParam && paymentOrderId)
  const paymentHubPath = hasPaymentReturn
    ? `/cabinet/subscription?${searchParams.toString()}`
    : null

  useEffect(() => {
    if (!authenticated) return
    if (paymentHubPath) {
      router.replace(paymentHubPath)
      return
    }
    if (nextPath) router.replace(nextPath)
  }, [authenticated, nextPath, paymentHubPath, router])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <>
        {hasPaymentReturn && paymentOrderId ? (
          <div className="mx-auto w-full max-w-md px-4 pt-6">
            <PaymentReturnStatus
              orderId={paymentOrderId}
              hint={paymentParam === "fail" ? "fail" : "return"}
              guest
            />
          </div>
        ) : null}
        <CabinetAuthPage
          onAuthenticated={() => {
            void refresh({ silent: true }).then(() => {
              if (paymentHubPath) router.replace(paymentHubPath)
              else if (nextPath) router.replace(nextPath)
            })
          }}
        />
      </>
    )
  }

  if (nextPath || paymentHubPath) {
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
