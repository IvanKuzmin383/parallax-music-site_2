import { ServicePageTemplate } from "@/components/cabinet/services/service-page-template"
import { getServiceBySlug } from "@/lib/cabinet/services-catalog"
import { notFound } from "next/navigation"

export default function AiTracksPage() {
  const service = getServiceBySlug("ai-tracks")
  if (!service) notFound()
  return <ServicePageTemplate service={service} />
}
