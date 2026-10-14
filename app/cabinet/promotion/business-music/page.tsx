import { BusinessMusicLanding } from "@/components/cabinet/promotion/business-music-landing"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { notFound } from "next/navigation"

export default function BusinessMusicPromotionPage() {
  const service = getServiceBySlug("business-music")
  if (!service) notFound()
  return <BusinessMusicLanding service={service} />
}
