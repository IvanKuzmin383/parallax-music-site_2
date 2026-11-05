import type { Metadata } from "next"
import { ErrorBoundary } from "@/components/error-boundary"
import { HubLanding } from "@/components/marketing/hub-landing"
import { TOOLS_HUB_CARDS } from "@/lib/marketing/public-catalog"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

export const metadata: Metadata = {
  title: "Инструменты для артистов - мастеринг, смартлинки, обложки | Parallax Music",
  description:
    "Self-serve инструменты в кабинете: онлайн-мастеринг, Slowed/Reverb, смартлинки, сниппеты и AI-обложки. Часть функций с первым бесплатным скачиванием.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: "Инструменты для артистов | Parallax Music",
    description: "Оформление, звук и контент в одном кабинете - без агентства.",
    url: `${siteUrl}/tools`,
  },
}

export default function ToolsHubPage() {
  return (
    <ErrorBoundary>
      <HubLanding
        title="Инструменты"
        titleHighlight="в одном кабинете"
        description="Мастеринг, Slowed/Reverb, смартлинки, сниппеты и обложки. Часть функций можно попробовать бесплатно - первое скачивание за наш счёт."
        primaryHref="/cabinet?tab=register"
        primaryLabel="Открыть кабинет"
        secondaryHref="/services"
        secondaryLabel="Услуги под ключ"
        cardsTitle="Что можно сделать самому"
        cardsDescription="Цены и описание - без звонков менеджеру. Заказ и скачивание в личном кабинете."
        cards={TOOLS_HUB_CARDS}
        footerNote="Нужен монтаж, реклама или плейлисты под ключ - смотрите раздел услуг."
      />
    </ErrorBoundary>
  )
}
