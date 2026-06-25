"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CabinetHeader } from "@/components/cabinet-header"
import { CookieConsentBanner } from "@/components/cookie-consent"

/** На страницах смартлинков (/s/...) шапка и подвал не показываются. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSmartlink = pathname?.startsWith("/s/")
  const isCabinet = pathname?.startsWith("/cabinet")

  if (isSmartlink) {
    return <>{children}</>
  }

  if (isCabinet) {
    return (
      <>
        <CabinetHeader />
        {children}
        <CookieConsentBanner />
      </>
    )
  }

  return (
    <>
      <Header />
      {children}
      <Footer />
      <CookieConsentBanner />
    </>
  )
}
