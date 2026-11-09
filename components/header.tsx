"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Mail, Menu, Send, X } from "lucide-react"
import { LanguageSwitcher } from "@/components/language-switcher"
import { useI18n } from "@/lib/i18n-context"
import { readReferralCodeFromCookie } from "@/components/referral-capture"
import { PARALLAX_EMAIL, PARALLAX_TELEGRAM_URL } from "@/lib/parallax-contacts"

export function Header() {
  const pathname = usePathname()
  const hideLogin = pathname === "/stihi"
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [cabinetHref, setCabinetHref] = useState("/cabinet")
  const { t } = useI18n()

  const copyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(PARALLAX_EMAIL)
      toast.success("Почта скопирована")
    } catch {
      toast.error("Не удалось скопировать почту")
    }
  }, [])

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("ref")?.trim()
    const fromCookie = readReferralCodeFromCookie()
    const ref = fromUrl || fromCookie
    setCabinetHref(ref ? `/cabinet?tab=register&ref=${encodeURIComponent(ref)}` : "/cabinet")
  }, [pathname])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", onKey)
    }
  }, [isMobileMenuOpen])

  const nav = [
    { href: "/distribution", label: t.header.distribution },
    { href: "/features", label: t.header.features },
    { href: "/promotion", label: t.header.promotion },
    { href: "/pricing", label: t.header.pricing },
    { href: "/cases", label: t.header.cases },
    { href: "/blog", label: t.header.blog },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/90 backdrop-blur-md border-b border-border/60" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 py-4 xl:grid xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:items-center xl:gap-4 2xl:gap-6">
        <Link href="/" className="flex-shrink-0 text-xl font-black tracking-tighter xl:text-2xl">
          <span className="text-foreground">PARALLAX</span>
          <span className="ml-1 text-primary">MUSIC</span>
        </Link>

        <nav className="hidden min-w-0 items-center justify-center gap-x-5 xl:flex 2xl:gap-x-6">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className="whitespace-nowrap text-[13px] uppercase tracking-wider transition-colors hover:text-primary 2xl:text-sm"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden flex-shrink-0 items-center justify-end gap-3 xl:flex">
          <a
            href={PARALLAX_TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label="Telegram"
          >
            <Send className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => void copyEmail()}
            className="text-muted-foreground transition-colors hover:text-primary"
            aria-label="Скопировать почту"
            title={PARALLAX_EMAIL}
          >
            <Mail className="h-4 w-4" />
          </button>
          <LanguageSwitcher />
          {!hideLogin && (
            <Button size="sm" className="uppercase tracking-wider" asChild>
              <Link href={cabinetHref} prefetch={false}>
                {t.header.login}
              </Link>
            </Button>
          )}
        </div>

        <button
          type="button"
          className="ml-2 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md text-foreground hover:bg-muted/50 xl:hidden"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div id="mobile-menu" className="border-t border-border bg-card/95 backdrop-blur-md xl:hidden">
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
              <a
                href={PARALLAX_TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="Telegram"
              >
                <Send className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={() => void copyEmail()}
                className="text-muted-foreground transition-colors hover:text-primary"
                aria-label="Скопировать почту"
                title={PARALLAX_EMAIL}
              >
                <Mail className="h-5 w-5" />
              </button>
              <LanguageSwitcher />
              {!hideLogin && (
                <Button size="sm" className="ml-auto uppercase tracking-wider" asChild>
                  <Link
                    href={cabinetHref}
                    prefetch={false}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t.header.login}
                  </Link>
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
