import type { Metadata } from "next"
import { ErrorBoundary } from "@/components/error-boundary"
import { Pricing } from "@/components/pricing"
import { FaqSection } from "@/components/faq-section"
import { Contact } from "@/components/contact"
import { MarketingHero } from "@/components/marketing/marketing-hero"

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
        <MarketingHero
          title="Тарифы"
          titleHighlight="дистрибуции"
          description="Выберите подписку или разовую оплату Fix. Оплатите - затем создайте кабинет на тот же email и загрузите трек."
          primaryHref="/cabinet?tab=register"
          primaryLabel="Создать кабинет"
          secondaryHref="/distribution"
          secondaryLabel="Как работает дистрибуция"
          className="min-h-[48vh] md:min-h-[52vh]"
        />
        <Pricing />
        <FaqSection />
        <Contact />
      </main>
    </ErrorBoundary>
  )
}
