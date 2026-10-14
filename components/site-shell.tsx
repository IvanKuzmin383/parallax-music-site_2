"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CookieConsentBanner } from "@/components/cookie-consent"
import { ReferralCapture } from "@/components/referral-capture"

/** На смартлинках, кабинете и админке шапка/подвал публичного сайта не показываются. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSmartlink = pathname?.startsWith("/s/")
  const isCabinet = pathname?.startsWith("/cabinet")
  const isAdmin =
    pathname?.startsWith("/admin26081993") ||
    pathname === "/admin" ||
    pathname?.startsWith("/admin/")

  const referral = (
    <Suspense fallback={null}>
      <ReferralCapture />
    </Suspense>
  )

  if (isSmartlink || isAdmin) {
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
        {children}
        <CookieConsentBanner />
      </>
    )
  }

  return (
    <>
      {referral}
      <Header />
      {children}
      <Footer />
      <CookieConsentBanner />
    </>
  )
}
