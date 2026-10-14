import type { Metadata } from "next"
import { YandexAdsLanding } from "@/components/cabinet/promotion/yandex-ads-landing"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { YANDEX_ADS_PRICE_LABEL } from "@/lib/yandex-ads-campaign"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Продвижение в Яндекс Директ",
  description: `Продвижение релизов, концертов и музыкальных проектов через Яндекс Директ. Подготовка объявлений, настройка и ведение кампании. Работа Parallax ${YANDEX_ADS_PRICE_LABEL}`,
  openGraph: {
    title: "Продвижение в Яндекс Директ - Parallax Music",
    description: `Продвижение релизов, концертов и музыкальных проектов через Яндекс Директ. Подготовка объявлений, настройка и ведение кампании. Работа Parallax ${YANDEX_ADS_PRICE_LABEL}`,
  },
}

export default function YandexPromotionPage() {
  const service = getServiceBySlug("yandex-ads")
  if (!service) notFound()
  return <YandexAdsLanding service={service} />
}
