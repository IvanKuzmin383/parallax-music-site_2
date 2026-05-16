 "use client"
 
 import Link from "next/link"
 import { useState, useEffect } from "react"
 import { Button } from "@/components/ui/button"
 import { Menu, X } from "lucide-react"
import { LanguageSwitcher } from "@/components/language-switcher"
 import { useI18n } from "@/lib/i18n-context"
 
 export function Header() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { t } = useI18n()

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-background/95 backdrop-blur-sm border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between md:grid md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-4 lg:gap-6">
        <Link
          href="/"
          className="text-xl md:text-2xl font-bold tracking-tighter flex-shrink-0"
        >
          <span className="text-foreground">PARALLAX</span>
          <span className="text-primary ml-1">MUSIC</span>
        </Link>

        {/* Desktop Navigation — средняя колонка растягивается (не 1/3 экрана), иначе пункты наезжают на блок справа и теряют клики */}
        <nav className="hidden md:flex min-w-0 items-center justify-center gap-x-4 gap-y-2 lg:gap-x-8 flex-wrap">
          <Link href="/#services" className="text-sm uppercase tracking-wider hover:text-primary transition-colors">
            {t.header.services}
          </Link>
          <Link href="/#reviews" className="text-sm uppercase tracking-wider hover:text-primary transition-colors">
            Отзывы
          </Link>
          <Link href="/blog" className="text-sm uppercase tracking-wider hover:text-primary transition-colors">
            {t.header.blog}
          </Link>
          <Link href="/ai" className="text-sm uppercase tracking-wider hover:text-primary transition-colors whitespace-nowrap">
            {t.header.aiMusic}
          </Link>
          <Link href="/#pricing" className="text-sm uppercase tracking-wider hover:text-primary transition-colors">
            {t.header.pricing}
          </Link>
          <Link href="/#contact" className="text-sm uppercase tracking-wider hover:text-primary transition-colors">
            {t.header.contact}
          </Link>
        </nav>

        <div className="hidden md:flex items-center gap-4 justify-end flex-shrink-0">
          <LanguageSwitcher />
          <Button
            size="sm"
            className="uppercase tracking-wider bg-primary text-primary-foreground hover:bg-primary/90"
            asChild
          >
            <Link href="/cabinet">{t.header.login}</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          className="md:hidden text-foreground flex-shrink-0 ml-2 inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-muted/50"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div id="mobile-menu" className="md:hidden bg-card border-t border-border" role="menu">
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
            <Link
              href="/#services"
              className="text-sm uppercase tracking-wider hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t.header.services}
            </Link>
            <Link
              href="/#reviews"
              className="text-sm uppercase tracking-wider hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Отзывы
            </Link>
            <Link
              href="/blog"
              className="text-sm uppercase tracking-wider hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t.header.blog}
            </Link>
            <Link
              href="/ai"
              className="text-sm uppercase tracking-wider hover:text-primary transition-colors whitespace-nowrap"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t.header.aiMusic}
            </Link>
            <Link
              href="/#pricing"
              className="text-sm uppercase tracking-wider hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t.header.pricing}
            </Link>
            <Link
              href="/#contact"
              className="text-sm uppercase tracking-wider hover:text-primary transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t.header.contact}
            </Link>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Button
                size="sm"
                className="uppercase tracking-wider bg-primary text-primary-foreground flex-1"
                asChild
              >
                <Link href="/cabinet" onClick={() => setIsMobileMenuOpen(false)}>
                  {t.header.login}
                </Link>
              </Button>
            </div>
          </nav>
        </div>
      )}

    </header>
  )
}
