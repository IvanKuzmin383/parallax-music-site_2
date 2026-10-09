import { ServicePageTemplate } from "@/components/cabinet/services/service-page-template"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { notFound } from "next/navigation"

export default function BusinessMusicPromotionPage() {
  const service = getServiceBySlug("business-music")
  if (!service) notFound()
  return <ServicePageTemplate service={service} />
}
