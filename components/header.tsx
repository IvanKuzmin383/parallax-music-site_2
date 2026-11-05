"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useI18n } from "@/lib/i18n-context"
import { readReferralCodeFromCookie } from "@/components/referral-capture"

export function Header() {
  const pathname = usePathname()
  const hideLogin = pathname === "/stihi"
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [cabinetHref, setCabinetHref] = useState("/cabinet")
  const [registerHref, setRegisterHref] = useState("/cabinet?tab=register")
  const { t } = useI18n()

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("ref")?.trim()
    const fromCookie = readReferralCodeFromCookie()
    const ref = fromUrl || fromCookie
    setCabinetHref(ref ? `/cabinet?tab=register&ref=${encodeURIComponent(ref)}` : "/cabinet")
    setRegisterHref(
      ref ? `/cabinet?tab=register&ref=${encodeURIComponent(ref)}` : "/cabinet?tab=register"
    )
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const nav = [
    { href: "/distribution", label: t.header.distribution },
    { href: "/tools", label: t.header.tools },
    { href: "/services", label: t.header.servicesHub },
    { href: "/promotion", label: t.header.promotion },
    { href: "/pricing", label: t.header.pricing },
    { href: "/blog", label: t.header.blog },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/90 backdrop-blur-md border-b border-border/60" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-4 md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-4 lg:gap-6">
        <Link href="/" className="flex-shrink-0 text-xl font-black tracking-tighter md:text-2xl">
          <span className="text-foreground">PARALLAX</span>
          <span className="ml-1 text-primary">MUSIC</span>
        </Link>

        <nav className="hidden min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 md:flex lg:gap-x-6">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="whitespace-nowrap text-sm uppercase tracking-wider transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-shrink-0 items-center justify-end gap-3 md:flex">
          <LanguageSwitcher />
          {!hideLogin && (
            <>
              <Button size="sm" variant="ghost" className="uppercase tracking-wider" asChild>
                <Link href={cabinetHref} prefetch={false}>
                  {t.header.login}
                </Link>
              </Button>
              <Button
                size="sm"
                className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
                asChild
              >
                <Link href={registerHref} prefetch={false}>
                  {t.header.register}
                </Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="ml-2 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div id="mobile-menu" className="border-t border-border bg-card/95 backdrop-blur-md md:hidden" role="menu">
          <nav className="container mx-auto flex flex-col gap-4 px-4 py-6">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="text-sm uppercase tracking-wider transition-colors hover:text-primary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              {!hideLogin && (
                <>
                  <Button size="sm" variant="outline" className="flex-1 uppercase tracking-wider" asChild>
                    <Link
                      href={cabinetHref}
                      prefetch={false}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t.header.login}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1 uppercase tracking-wider bg-primary text-primary-foreground"
                    asChild
                  >
                    <Link
                      href={registerHref}
                      prefetch={false}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t.header.register}
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
