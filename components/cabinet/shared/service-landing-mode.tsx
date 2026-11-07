"use client"

import { createContext, useCallback, useContext, type ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ServiceLandingMode = { mode: "cabinet" } | { mode: "public"; cabinetPath: string }

const ServiceLandingModeContext = createContext<ServiceLandingMode>({ mode: "cabinet" })

export function cabinetAuthHref(cabinetPath: string, register = false): string {
  const next = `next=${encodeURIComponent(cabinetPath)}`
  return register ? `/cabinet?tab=register&${next}` : `/cabinet?${next}`
}

/** Тот же лендинг услуги, что в кабинете, но для публичного сайта: без формы, заказ - через вход в кабинет. */
export function PublicServiceLanding({
  cabinetPath,
  children,
}: {
  cabinetPath: string
  children: ReactNode
}) {
  return (
    <ServiceLandingModeContext.Provider value={{ mode: "public", cabinetPath }}>
      <div className="mx-auto w-full max-w-[1180px] px-4 pb-16 pt-24 sm:px-6 md:pt-28 lg:px-8">
        {children}
      </div>
    </ServiceLandingModeContext.Provider>
  )
}

export function useIsPublicLanding(): boolean {
  return useContext(ServiceLandingModeContext).mode === "public"
}

/** В кабинете - исходный обработчик (скролл к форме), на сайте - переход к услуге в кабинете. */
export function useOrderAction(cabinetAction: () => void): () => void {
  const ctx = useContext(ServiceLandingModeContext)
  const router = useRouter()
  const cabinetPath = ctx.mode === "public" ? ctx.cabinetPath : null
  return useCallback(() => {
    if (cabinetPath) {
      router.push(cabinetAuthHref(cabinetPath))
      return
    }
    cabinetAction()
  }, [cabinetPath, cabinetAction, router])
}

export function CabinetOnly({ children }: { children: ReactNode }) {
  return useIsPublicLanding() ? null : <>{children}</>
}

export function PublicOrderGate({ className }: { className?: string }) {
  const ctx = useContext(ServiceLandingModeContext)
  if (ctx.mode !== "public") return null
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col justify-center gap-4 rounded-[12px] border border-border bg-card p-5 sm:p-6",
        className,
      )}
    >
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          Заказ оформляется в личном кабинете
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Войдите или создайте кабинет - откроем эту услугу сразу, без поиска по меню. Оплата с
          баланса кабинета, статус заказа виден в разделе «Заказы».
        </p>
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <Button asChild className="h-11 min-h-11 flex-1 px-5">
          <Link href={cabinetAuthHref(ctx.cabinetPath)}>
            Заказать
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-11 min-h-11 flex-1 px-5">
          <Link href={cabinetAuthHref(ctx.cabinetPath, true)}>Создать кабинет</Link>
        </Button>
      </div>
    </div>
  )
}
