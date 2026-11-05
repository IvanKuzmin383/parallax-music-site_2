import type { Metadata } from "next"
import { ErrorBoundary } from "@/components/error-boundary"
import { HubLanding } from "@/components/marketing/hub-landing"
import {
  getVisibleServicesCatalog,
  type ServiceCatalogEntry,
} from "@/lib/cabinet/services-catalog"
import { PUBLIC_SERVICE_SLUGS } from "@/lib/marketing/public-catalog"

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://parallaxmusic.ru"

export const metadata: Metadata = {
  title: "Услуги для артистов - продвижение, оформление, AI | Parallax Music",
  description:
    "Каталог услуг Parallax Music: реклама VK и Яндекс, плейлисты, видео, обложки, мастеринг и AI. Заказ в личном кабинете.",
  alternates: { canonical: "/services" },
  openGraph: {
    title: "Услуги для артистов | Parallax Music",
    description: "Продвижение и оформление под ключ - с ценами и понятным процессом.",
    url: `${siteUrl}/services`,
  },
}

function toCard(service: ServiceCatalogEntry) {
  return {
    id: service.slug,
    title: service.title,
    description: service.shortDescription,
    href: `/services/${service.slug}`,
    priceLabel: service.pricePrefix
      ? `${service.pricePrefix}${service.priceLabel}`
      : service.priceLabel,
    badge: service.comingSoon ? "Скоро" : undefined,
  }
}

export default function ServicesHubPage() {
  const catalog = getVisibleServicesCatalog()
  const cards = PUBLIC_SERVICE_SLUGS.map((slug) => catalog.find((s) => s.slug === slug))
    .filter((s): s is ServiceCatalogEntry => Boolean(s))
    .map(toCard)

  return (
    <ErrorBoundary>
      <HubLanding
        title="Услуги"
        titleHighlight="под ключ"
        description="Продвижение, оформление и AI-задачи, которые мы берём на себя. Цена на карточке - заказ и статус в кабинете."
        primaryHref="/cabinet?tab=register"
        primaryLabel="Открыть кабинет"
        secondaryHref="/tools"
        secondaryLabel="Сделать самому"
        cardsTitle="Каталог услуг"
        cardsDescription="Даже если релиз выпущен не через нас - многие услуги доступны отдельно."
        cards={cards}
        footerNote="Нужна только дистрибуция - смотрите тарифы. Нужны быстрые self-serve инструменты - раздел Инструменты."
      />
    </ErrorBoundary>
  )
}
