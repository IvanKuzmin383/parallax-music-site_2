import type { Metadata } from "next"
import { PlaylisthubLanding } from "@/components/cabinet/promotion/playlisthub-landing"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { PLAYLISTHUB_BASE_PRICE_LABEL } from "@/lib/playlisthub-landing"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Размещение в плейлистах Яндекс Музыки",
  description: `Размещение трека в пользовательских плейлистах Яндекс Музыки через PlaylistHub. Базовая цена ${PLAYLISTHUB_BASE_PRICE_LABEL}. Выбор плейлистов, заказ и оплата - на playlisthub.ru.`,
  openGraph: {
    title: "Размещение в плейлистах Яндекс Музыки - Parallax Music и PlaylistHub",
    description: `Размещение трека в пользовательских плейлистах Яндекс Музыки через PlaylistHub. Базовая цена ${PLAYLISTHUB_BASE_PRICE_LABEL}. Выбор плейлистов, заказ и оплата - на playlisthub.ru.`,
  },
}

export default function PlaylistsPromotionPage() {
  const service = getServiceBySlug("playlists")
  if (!service) notFound()
  return <PlaylisthubLanding service={service} />
}
