"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import {
  isUploadSubscriptionPaywallReason,
  UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED,
} from "@/lib/cabinet-upload-subscription-client"
import {
  CabinetSubscriptionPaywallDialog,
  type SubscriptionPaywallStatus,
} from "@/components/cabinet/subscription/cabinet-subscription-paywall-dialog"
import {
  CabinetSubscriptionCheckoutDialog,
  type CabinetSubscriptionCheckoutParams,
  type SubscriptionPurchaseIntent,
} from "@/components/cabinet/subscription/cabinet-subscription-checkout-dialog"
import type { PlanId } from "@/lib/plan-pricing"

type CabinetSubscriptionContextValue = {
  openPaywall: (reason?: string | null) => void
  /** Toast + paywall для блока загрузки; профиль - toast без paywall. */
  handleUploadBlock: (reason: string | null | undefined) => void
  openCheckout: (params: CabinetSubscriptionCheckoutParams) => void
}

const CabinetSubscriptionContext = createContext<CabinetSubscriptionContextValue | null>(null)

export function CabinetSubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useCabinetSession()
  const [paywallOpen, setPaywallOpen] = useState(false)
  const [reason, setReason] = useState<string | null>(null)

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPlanId, setCheckoutPlanId] = useState<PlanId | null>(null)
  const [checkoutIntent, setCheckoutIntent] = useState<SubscriptionPurchaseIntent | undefined>()
  const [checkoutPeriod, setCheckoutPeriod] = useState<"month" | "year">("year")

  const status: SubscriptionPaywallStatus | null = user
    ? {
        subscriptionName: user.subscriptionName,
        subscriptionExpiresAt: user.subscriptionExpiresAt,
      }
    : null

  const openPaywall = useCallback((nextReason?: string | null) => {
    setReason(nextReason?.trim() || UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED)
    setPaywallOpen(true)
  }, [])

  const openCheckout = useCallback((params: CabinetSubscriptionCheckoutParams) => {
    setPaywallOpen(false)
    setCheckoutPlanId(params.planId)
    setCheckoutIntent(params.purchaseIntent)
    setCheckoutPeriod(params.period === "month" ? "month" : "year")
    setCheckoutOpen(true)
  }, [])

  const handleUploadBlock = useCallback(
    (raw: string | null | undefined) => {
      const block = (raw?.trim() || UPLOAD_ACTIVE_SUBSCRIPTION_REQUIRED).trim()
      if (!isUploadSubscriptionPaywallReason(block)) {
        toast.message("Заполните профиль", {
          description: block,
          action: {
            label: "Профиль",
            onClick: () => {
              window.location.href = "/cabinet/settings?tab=profile"
            },
          },
        })
        return
      }
      openPaywall(block)
      toast.error(block, {
        action: {
          label: "Оплатить",
          onClick: () => openPaywall(block),
        },
      })
    },
    [openPaywall]
  )

  const value = useMemo(
    () => ({ openPaywall, handleUploadBlock, openCheckout }),
    [openPaywall, handleUploadBlock, openCheckout]
  )

  return (
    <CabinetSubscriptionContext.Provider value={value}>
      {children}
      <CabinetSubscriptionPaywallDialog
        open={paywallOpen}
        reason={reason}
        status={status}
        onOpenChange={setPaywallOpen}
        onCheckout={openCheckout}
      />
      <CabinetSubscriptionCheckoutDialog
        open={checkoutOpen}
        planId={checkoutPlanId}
        purchaseIntent={checkoutIntent}
        initialPeriod={checkoutPeriod}
        userEmail={user?.email}
        onOpenChange={setCheckoutOpen}
      />
    </CabinetSubscriptionContext.Provider>
  )
}

export function useCabinetSubscription(): CabinetSubscriptionContextValue {
  const ctx = useContext(CabinetSubscriptionContext)
  if (!ctx) {
    throw new Error("useCabinetSubscription must be used within CabinetSubscriptionProvider")
  }
  return ctx
}
