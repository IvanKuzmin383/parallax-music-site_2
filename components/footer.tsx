"use client"

import { useI18n } from "@/lib/i18n-context"
import Link from "next/link"
import Image from "next/image"

// Custom Telegram icon SVG
const TelegramIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M22 2L11 13" />
    <path d="M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
)

// VK (ВКонтакте) icon
const VkIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1.01-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4.03 8.57 4.03 8.096c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.847 2.462 2.253 4.624 2.836 4.624.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.154-3.574 2.154-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.203.339-.271.508 0 .847.203.271.847 1.017 1.287 1.677.847 1.186 1.49 2.186 1.662 2.677.17.491-.085.744-.576.744z" />
  </svg>
)

export function Footer() {
  const { t } = useI18n()

  return (
    <footer className="bg-background border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="text-2xl font-bold tracking-tighter mb-4">
              <span className="text-foreground">PARALLAX</span>
              <span className="text-primary ml-1">MUSIC</span>
            </div>
            <p className="text-sm text-muted-foreground">{t.footer.tagline}</p>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-wider font-bold mb-4">{t.footer.services}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/#advantages" className="hover:text-primary transition-colors">
                  {t.services.labelServices.title}
                </a>
              </li>
              <li>
                <a href="/#pricing" className="hover:text-primary transition-colors">
                  {t.header.pricing}
                </a>
              </li>
              <li>
                <a href="/promotion" className="hover:text-primary transition-colors">
                  {t.services.radioPromotion.title}
                </a>
              </li>
              <li>
                <a href="/#contact" className="hover:text-primary transition-colors">
                  {t.header.contact}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm uppercase tracking-wider font-bold mb-4">{t.footer.company}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="/#about" className="hover:text-primary transition-colors">
                  {t.footer.aboutUs}
                </a>
              </li>
              <li>
                <a href="/#contact" className="hover:text-primary transition-colors">
                  {t.footer.careers}
                </a>
              </li>
              <li>
                <a href="/#follow-us" className="hover:text-primary transition-colors">
                  {t.header.contact}
                </a>
              </li>
            </ul>
          </div>

          <div id="follow-us">
            <h3 className="text-sm uppercase tracking-wider font-bold mb-4">{t.footer.followUs}</h3>
            <div className="flex gap-4">
              <a
                href="https://t.me/parallaxmusic_rt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Telegram"
              >
                <TelegramIcon size={20} />
              </a>
              <a
                href="https://vk.com/parallaxmusic_releaseteam"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="VK"
              >
                <VkIcon size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center md:items-start gap-4">
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-sm text-muted-foreground text-center md:text-left leading-none">{t.footer.copyright}</p>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Image src="/rkn-logo.png" alt="Логотип Роскомнадзора" width={20} height={20} />
              <span>Реестр Роскомнадзора</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-x-6 gap-y-2 text-sm text-muted-foreground leading-none">
            <Link href="/privacy" prefetch={false} className="hover:text-primary transition-colors">
              {t.footer.privacyPolicy}
            </Link>
            <Link href="/cookies" prefetch={false} className="hover:text-primary transition-colors">
              Политика cookie
            </Link>
            <Link href="/terms" prefetch={false} className="hover:text-primary transition-colors">
              {t.footer.termsOfService}
            </Link>
            <Link href="/offer" prefetch={false} className="hover:text-primary transition-colors">
              {t.footer.publicOffer}
            </Link>
            <Link href="/personal-data-consent" prefetch={false} className="hover:text-primary transition-colors">
              {t.footer.personalDataConsent}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
