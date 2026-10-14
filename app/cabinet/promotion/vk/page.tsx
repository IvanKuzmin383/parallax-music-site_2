import type { Metadata } from "next"
import { VkAdsLanding } from "@/components/cabinet/promotion/vk-ads-landing"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { VK_ADS_PRICE_LABEL } from "@/lib/vk-ads-campaign"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Таргетированная реклама в VK",
  description: `Продвижение треков и музыкальных проектов в VK. Подготовка объявлений, тестирование аудиторий и ведение кампании. Работа Parallax ${VK_ADS_PRICE_LABEL}`,
  openGraph: {
    title: "Таргетированная реклама в VK - Parallax Music",
    description: `Продвижение треков и музыкальных проектов в VK. Подготовка объявлений, тестирование аудиторий и ведение кампании. Работа Parallax ${VK_ADS_PRICE_LABEL}`,
  },
}

export default function VkPromotionPage() {
  const service = getServiceBySlug("vk-ads")
  if (!service) notFound()
  return <VkAdsLanding service={service} />
}
