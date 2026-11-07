import type { Metadata } from "next"
import { ErrorBoundary } from "@/components/error-boundary"
import { Pricing } from "@/components/pricing"
import { FaqSection } from "@/components/faq-section"
import { Contact } from "@/components/contact"
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

export const metadata: Metadata = {
  title: "Тарифы дистрибуции музыки | Parallax Music",
  description:
    "Подписка или тариф Fix за трек. Оплатите, создайте кабинет и загрузите релиз на 50+ площадок с 100% роялти.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Тарифы дистрибуции музыки | Parallax Music",
    description: "Прозрачные тарифы: подписка или разовая оплата Fix.",
    url: `${siteUrl}/pricing`,
  },
}

export default function PricingPage() {
  return (
    <ErrorBoundary>
      <main id="main-content" className="min-h-screen">
        <Pricing asPageHeader />
        <FaqSection />
        <Contact />
      </main>
    </ErrorBoundary>
  )
}
