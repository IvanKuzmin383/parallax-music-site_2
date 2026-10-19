"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CookieConsentBanner } from "@/components/cookie-consent"
import { ReferralCapture } from "@/components/referral-capture"
import { SiteAtmosphere } from "@/components/site-atmosphere"

type SiteShellProps = {
  children: React.ReactNode
  /** Short-домен prllx.link - без шапки/подвала основного сайта. */
  bareShell?: boolean
}

/** На смартлинках, кабинете, админке и странице техработ шапка/подвал публичного сайта не показываются. */
export function SiteShell({ children, bareShell = false }: SiteShellProps) {
  const pathname = usePathname()
  const isSmartlink = pathname?.startsWith("/s/")
  const isPrllxLanding = pathname === "/prllx" || pathname?.startsWith("/prllx/")
  const isCabinet = pathname?.startsWith("/cabinet")
  const isMaintenance = pathname === "/maintenance"
  const isAdmin =
    pathname?.startsWith("/admin26081993") ||
    pathname === "/admin" ||
    pathname?.startsWith("/admin/")

  const referral = (
    <Suspense fallback={null}>
      <ReferralCapture />
    </Suspense>
  )

  if (bareShell || isSmartlink || isPrllxLanding || isAdmin || isMaintenance) {
    return (
      <>
        {referral}
        {children}
      </>
    )
  }

  if (isCabinet) {
    return (
      <>
        {referral}
        <div className="relative z-10">{children}</div>
        <CookieConsentBanner />
      </>
    )
  }

  return (
    <>
      {referral}
      <SiteAtmosphere />
      <div className="relative z-10">
        <Header />
        {children}
        <Footer />
      </div>
      <CookieConsentBanner />
    </>
  )
}
