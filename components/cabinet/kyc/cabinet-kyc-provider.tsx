"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname, useRouter } from "next/navigation"
import { useCabinetSession } from "@/lib/cabinet/hooks/use-cabinet-session"
import type { CabinetKycStatusView } from "@/lib/cabinet/types"
import { CabinetKycRequiredDialog } from "@/components/cabinet/kyc/cabinet-kyc-required-dialog"
import { CabinetKycFormDialog } from "@/components/cabinet/kyc/cabinet-kyc-form-dialog"

type KycPublicState = {
  kycStatus: CabinetKycStatusView
  kycRejectionReason: string | null
  canSubmit: boolean
  application: {
    id: string
    status: string
    rejectionReason: string | null
    submittedAt: string
  } | null
}

type CabinetKycContextValue = {
  status: CabinetKycStatusView
  rejectionReason: string | null
  loading: boolean
  /** false пока нет статуса из сессии или /api/cabinet/kyc */
  ready: boolean
  refresh: () => Promise<void>
  openRequired: () => void
  openForm: () => void
  isVerified: boolean
}

const CabinetKycContext = createContext<CabinetKycContextValue | null>(null)

function isKycGatedPath(pathname: string | null): boolean {
  if (!pathname) return false
  if (pathname === "/cabinet/upload" || pathname.startsWith("/cabinet/upload/")) return true
  if (
    pathname === "/cabinet/distribution/music-video/upload" ||
    pathname.startsWith("/cabinet/distribution/music-video/upload/")
  ) {
    return true
  }
  return false
}

export function CabinetKycProvider({ children }: { children: ReactNode }) {
  const {
    authenticated,
    user,
    loading: sessionLoading,
    refresh: refreshSession,
  } = useCabinetSession()
  const pathname = usePathname()
  const router = useRouter()

  const [state, setState] = useState<KycPublicState | null>(null)
  const [loading, setLoading] = useState(false)
  const [requiredOpen, setRequiredOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [gateBlocked, setGateBlocked] = useState(false)

  const refresh = useCallback(async () => {
    if (!authenticated) {
      setState(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/cabinet/kyc", { credentials: "include" })
      if (!res.ok) return
      const data = (await res.json()) as KycPublicState
      setState(data)
      await refreshSession({ silent: true })
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [authenticated, refreshSession])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // API - источник истины; до ответа берём kycStatus из сессии, чтобы не мигать «unverified»
  const status: CabinetKycStatusView =
    state?.kycStatus ?? user?.kycStatus ?? "unverified"
  const isVerified = status === "verified"
  const ready =
    !sessionLoading && (!authenticated || state !== null || user !== null)
  const rejectionReason =
    state?.kycRejectionReason ?? user?.kycRejectionReason ?? null

  useEffect(() => {
    if (!isVerified) return
    setRequiredOpen(false)
    setFormOpen(false)
    setGateBlocked(false)
  }, [isVerified])

  useEffect(() => {
    if (!authenticated || !ready || loading) return
    if (!isKycGatedPath(pathname)) {
      setGateBlocked(false)
      return
    }
    if (isVerified) {
      setGateBlocked(false)
      return
    }
    setGateBlocked(true)
    setRequiredOpen(true)
  }, [authenticated, ready, loading, pathname, isVerified])

  const openRequired = useCallback(() => {
    if (isVerified) return
    setRequiredOpen(true)
  }, [isVerified])

  const openForm = useCallback(() => {
    if (isVerified) {
      setRequiredOpen(false)
      setFormOpen(false)
      return
    }
    setRequiredOpen(false)
    setFormOpen(true)
  }, [isVerified])

  const handleRequiredDismiss = useCallback(() => {
    setRequiredOpen(false)
    if (gateBlocked) {
      setGateBlocked(false)
      router.replace("/cabinet/distribution/music")
    }
  }, [gateBlocked, router])

  const value = useMemo<CabinetKycContextValue>(
    () => ({
      status,
      rejectionReason,
      loading: loading || sessionLoading || !ready,
      ready,
      refresh,
      openRequired,
      openForm,
      isVerified,
    }),
    [
      status,
      rejectionReason,
      loading,
      sessionLoading,
      ready,
      refresh,
      openRequired,
      openForm,
      isVerified,
    ]
  )

  return (
    <CabinetKycContext.Provider value={value}>
      {children}
      <CabinetKycRequiredDialog
        open={requiredOpen && !isVerified}
        status={status}
        onOpenChange={(open) => {
          if (!open) handleRequiredDismiss()
          else if (!isVerified) setRequiredOpen(true)
        }}
        onStartVerification={openForm}
        onDismiss={handleRequiredDismiss}
      />
      <CabinetKycFormDialog
        open={formOpen && !isVerified}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open && gateBlocked && !isVerified) {
            setRequiredOpen(true)
          }
        }}
        status={status}
        rejectionReason={rejectionReason}
        canSubmit={Boolean(state?.canSubmit)}
        onSubmitted={() => {
          void refresh()
          setFormOpen(false)
        }}
      />
    </CabinetKycContext.Provider>
  )
}

export function useCabinetKyc(): CabinetKycContextValue {
  const ctx = useContext(CabinetKycContext)
  if (!ctx) {
    throw new Error("useCabinetKyc must be used within CabinetKycProvider")
  }
  return ctx
}
