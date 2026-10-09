"use client"

import { usePathname } from "next/navigation"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { CookieConsentBanner } from "@/components/cookie-consent"

/** На смартлинках, кабинете и админке шапка/подвал публичного сайта не показываются. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isSmartlink = pathname?.startsWith("/s/")
  const isCabinet = pathname?.startsWith("/cabinet")
  const isAdmin =
    pathname?.startsWith("/admin26081993") ||
    pathname === "/admin" ||
    pathname?.startsWith("/admin/")

  if (isSmartlink || isAdmin) {
    return <>{children}</>
  }

  if (isCabinet) {
    return (
      <>
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
